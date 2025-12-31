import { EventEmitter } from 'events';
import { Task } from '../../orchestrator/orchestrator';
import { AgentSolution, AgentThoughts } from '../local-agent';

/**
 * Типы сообщений для координации агентов
 */
export enum MessageType {
    // Задачи
    TASK_CREATED = 'task.created',
    TASK_CLAIMED = 'task.claimed',
    TASK_COMPLETED = 'task.completed',
    TASK_FAILED = 'task.failed',
    
    // Решения
    SOLUTION_PROPOSED = 'solution.proposed',
    SOLUTION_APPROVED = 'solution.approved',
    SOLUTION_REJECTED = 'solution.rejected',
    
    // Коммуникация между агентами
    AGENT_QUESTION = 'agent.question',
    AGENT_ANSWER = 'agent.answer',
    COLLABORATION_REQUEST = 'collaboration.request',
    COLLABORATION_RESPONSE = 'collaboration.response',
    
    // Файлы и изменения
    FILE_CHANGED = 'file.changed',
    FILE_CONFLICT = 'file.conflict',
    
    // Системные
    AGENT_STARTED = 'agent.started',
    AGENT_STOPPED = 'agent.stopped',
    AGENT_IDLE = 'agent.idle',
    AGENT_BUSY = 'agent.busy'
}

/**
 * Базовое сообщение
 */
export interface Message<T = any> {
    id: string;
    type: MessageType;
    from: string;        // ID отправителя
    to?: string;         // ID получателя (undefined = broadcast)
    payload: T;
    timestamp: Date;
    correlationId?: string; // Для связи запроса и ответа
}

/**
 * Обработчик сообщений
 */
export type MessageHandler<T = any> = (message: Message<T>) => void | Promise<void>;

/**
 * Подписка на сообщения
 */
interface Subscription {
    agentId: string;
    types: MessageType[];
    handler: MessageHandler;
}

/**
 * Шина сообщений для Swarm координации агентов
 * Реализует peer-to-peer коммуникацию и broadcast
 */
export class MessageBus extends EventEmitter {
    private subscriptions: Map<string, Subscription[]>; // agentId -> subscriptions
    private messageHistory: Message[];
    private maxHistorySize: number = 1000;
    
    constructor() {
        super();
        this.subscriptions = new Map();
        this.messageHistory = [];
    }
    
    /**
     * Подписаться на сообщения определенных типов
     */
    subscribe(
        agentId: string,
        types: MessageType[],
        handler: MessageHandler
    ): () => void {
        const subscription: Subscription = {
            agentId,
            types,
            handler
        };
        
        const agentSubs = this.subscriptions.get(agentId) || [];
        agentSubs.push(subscription);
        this.subscriptions.set(agentId, agentSubs);
        
        console.log(`MessageBus: Agent ${agentId} subscribed to ${types.join(', ')}`);
        
        // Возвращаем функцию для отписки
        return () => this.unsubscribe(agentId, subscription);
    }
    
    /**
     * Отписаться от сообщений
     */
    private unsubscribe(agentId: string, subscription: Subscription): void {
        const agentSubs = this.subscriptions.get(agentId);
        if (agentSubs) {
            const index = agentSubs.indexOf(subscription);
            if (index !== -1) {
                agentSubs.splice(index, 1);
            }
        }
    }
    
    /**
     * Отправить сообщение агенту или broadcast
     */
    async publish<T = any>(message: Omit<Message<T>, 'id' | 'timestamp'>): Promise<void> {
        const fullMessage: Message<T> = {
            ...message,
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date()
        };
        
        // Сохраняем в историю
        this.messageHistory.push(fullMessage);
        if (this.messageHistory.length > this.maxHistorySize) {
            this.messageHistory.shift();
        }
        
        // Если указан получатель - отправляем только ему
        if (fullMessage.to) {
            await this.deliverToAgent(fullMessage.to, fullMessage);
        } else {
            // Broadcast - отправляем всем подписчикам
            await this.broadcastMessage(fullMessage);
        }
        
        // Отправляем event для логирования/мониторинга
        this.emit('message', fullMessage);
    }
    
    /**
     * Доставить сообщение конкретному агенту
     */
    private async deliverToAgent(agentId: string, message: Message): Promise<void> {
        const subscriptions = this.subscriptions.get(agentId);
        if (!subscriptions) {
            console.warn(`MessageBus: No subscriptions for agent ${agentId}`);
            return;
        }
        
        for (const sub of subscriptions) {
            if (sub.types.includes(message.type)) {
                try {
                    await sub.handler(message);
                } catch (error) {
                    console.error(`MessageBus: Error in handler for agent ${agentId}:`, error);
                }
            }
        }
    }
    
    /**
     * Broadcast сообщения всем подписчикам
     */
    private async broadcastMessage(message: Message): Promise<void> {
        const deliveries: Promise<void>[] = [];
        
        for (const [agentId, subscriptions] of this.subscriptions.entries()) {
            // Не отправляем отправителю его же сообщение
            if (agentId === message.from) continue;
            
            for (const sub of subscriptions) {
                if (sub.types.includes(message.type)) {
                    deliveries.push(
                        (async () => {
                            try {
                                await sub.handler(message);
                            } catch (error) {
                                console.error(`MessageBus: Error in broadcast handler for agent ${agentId}:`, error);
                            }
                        })()
                    );
                }
            }
        }
        
        await Promise.allSettled(deliveries);
    }
    
    /**
     * Отправить запрос и ждать ответа (Request-Response pattern)
     */
    async request<TRequest = any, TResponse = any>(
        from: string,
        to: string,
        type: MessageType,
        payload: TRequest,
        timeout: number = 30000
    ): Promise<TResponse> {
        const correlationId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Создаем Promise для ожидания ответа
        const responsePromise = new Promise<TResponse>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.unsubscribe(from, subscription);
                reject(new Error(`Request timeout after ${timeout}ms`));
            }, timeout);
            
            const subscription: Subscription = {
                agentId: from,
                types: [MessageType.AGENT_ANSWER, MessageType.COLLABORATION_RESPONSE],
                handler: (message: Message) => {
                    if (message.correlationId === correlationId) {
                        clearTimeout(timeoutId);
                        this.unsubscribe(from, subscription);
                        resolve(message.payload as TResponse);
                    }
                }
            };
            
            const agentSubs = this.subscriptions.get(from) || [];
            agentSubs.push(subscription);
            this.subscriptions.set(from, agentSubs);
        });
        
        // Отправляем запрос
        await this.publish({
            type,
            from,
            to,
            payload,
            correlationId
        });
        
        return responsePromise;
    }
    
    /**
     * Отправить ответ на запрос
     */
    async respond<T = any>(
        originalMessage: Message,
        responseType: MessageType,
        payload: T
    ): Promise<void> {
        await this.publish({
            type: responseType,
            from: originalMessage.to || 'system',
            to: originalMessage.from,
            payload,
            correlationId: originalMessage.correlationId
        });
    }
    
    /**
     * Получить историю сообщений
     */
    getHistory(filter?: {
        type?: MessageType;
        from?: string;
        to?: string;
        since?: Date;
    }): Message[] {
        let history = this.messageHistory;
        
        if (filter) {
            history = history.filter(msg => {
                if (filter.type && msg.type !== filter.type) return false;
                if (filter.from && msg.from !== filter.from) return false;
                if (filter.to && msg.to !== filter.to) return false;
                if (filter.since && msg.timestamp < filter.since) return false;
                return true;
            });
        }
        
        return history;
    }
    
    /**
     * Очистить историю сообщений
     */
    clearHistory(): void {
        this.messageHistory = [];
    }
    
    /**
     * Получить статистику
     */
    getStatistics() {
        const messagesByType: Record<string, number> = {};
        
        for (const msg of this.messageHistory) {
            messagesByType[msg.type] = (messagesByType[msg.type] || 0) + 1;
        }
        
        return {
            totalMessages: this.messageHistory.length,
            subscribedAgents: this.subscriptions.size,
            totalSubscriptions: Array.from(this.subscriptions.values()).reduce((sum, subs) => sum + subs.length, 0),
            messagesByType
        };
    }
    
    /**
     * Удалить все подписки агента (при остановке)
     */
    unsubscribeAll(agentId: string): void {
        this.subscriptions.delete(agentId);
        console.log(`MessageBus: Unsubscribed all for agent ${agentId}`);
    }
}

/**
 * Singleton instance для глобального доступа
 */
let globalMessageBus: MessageBus | null = null;

export function getGlobalMessageBus(): MessageBus {
    if (!globalMessageBus) {
        globalMessageBus = new MessageBus();
    }
    return globalMessageBus;
}
