import { SettingsManager } from '../integration/settings-manager';
import { Proposal, ProjectGoal } from './virtual-user';

export interface Decision {
    approved: boolean;
    confidence: number;
    reason: string;
}

export class DecisionMaker {
    private settingsManager: SettingsManager;

    constructor(settingsManager: SettingsManager) {
        this.settingsManager = settingsManager;
    }

    /**
     * Анализ предложения и принятие решения
     */
    async analyzeProposal(proposal: Proposal, projectGoals: ProjectGoal[]): Promise<Decision> {
        let score = 0;
        const reasons: string[] = [];

        // Проверка соответствия целям проекта
        const goalAlignment = this.checkGoalAlignment(proposal, projectGoals);
        score += goalAlignment.score;
        if (goalAlignment.reason) {
            reasons.push(goalAlignment.reason);
        }

        // Оценка качества решения
        const qualityScore = this.assessQuality(proposal);
        score += qualityScore.score;
        if (qualityScore.reason) {
            reasons.push(qualityScore.reason);
        }

        // Оценка рисков
        const riskScore = this.assessRisks(proposal);
        score -= riskScore.penalty;
        if (riskScore.reason) {
            reasons.push(riskScore.reason);
        }

        // Оценка приоритета
        const priorityScore = this.assessPriority(proposal);
        score += priorityScore.score;
        if (priorityScore.reason) {
            reasons.push(priorityScore.reason);
        }

        // Нормализация оценки (0-1)
        const normalizedScore = Math.max(0, Math.min(1, score / 4));
        
        // Порог принятия решения
        const threshold = this.settingsManager.virtualUserDecisionThreshold;
        const approved = normalizedScore >= threshold;

        return {
            approved,
            confidence: normalizedScore,
            reason: reasons.join('; ') || (approved ? 'Предложение соответствует критериям' : 'Предложение не соответствует критериям')
        };
    }

    /**
     * Проверка соответствия целям проекта
     */
    private checkGoalAlignment(proposal: Proposal, goals: ProjectGoal[]): { score: number; reason?: string } {
        if (goals.length === 0) {
            return { score: 0.5 }; // Нейтральная оценка, если целей нет
        }

        // Простая проверка ключевых слов
        const proposalText = `${proposal.title} ${proposal.description}`.toLowerCase();
        let matches = 0;

        for (const goal of goals) {
            const goalWords = goal.description.toLowerCase().split(/\s+/);
            for (const word of goalWords) {
                if (word.length > 3 && proposalText.includes(word)) {
                    matches++;
                    break;
                }
            }
        }

        const alignment = matches / goals.length;
        
        return {
            score: alignment,
            reason: alignment > 0.5 
                ? `Соответствует ${Math.round(alignment * 100)}% целей проекта`
                : `Соответствует только ${Math.round(alignment * 100)}% целей проекта`
        };
    }

    /**
     * Оценка качества решения
     */
    private assessQuality(proposal: Proposal): { score: number; reason?: string } {
        let score = 0.5; // Базовая оценка

        // Проверка наличия описания
        if (proposal.description.length > 50) {
            score += 0.1;
        }

        // Проверка наличия преимуществ
        if (proposal.benefits.length > 0) {
            score += 0.1;
        }

        // Проверка оценки времени
        if (proposal.estimatedTime) {
            score += 0.1;
        }

        // Использование confidence из предложения
        score = (score + proposal.confidence) / 2;

        return {
            score: Math.min(1, score),
            reason: score > 0.7 
                ? 'Высокое качество предложения'
                : score > 0.5
                ? 'Среднее качество предложения'
                : 'Низкое качество предложения'
        };
    }

    /**
     * Оценка рисков
     */
    private assessRisks(proposal: Proposal): { penalty: number; reason?: string } {
        let penalty = 0;

        // Количество рисков
        if (proposal.risks.length > 3) {
            penalty += 0.3;
        } else if (proposal.risks.length > 1) {
            penalty += 0.15;
        }

        // Критичные риски
        const criticalRisks = proposal.risks.filter(r => 
            r.toLowerCase().includes('критич') || 
            r.toLowerCase().includes('critical') ||
            r.toLowerCase().includes('безопасн') ||
            r.toLowerCase().includes('security')
        );

        if (criticalRisks.length > 0) {
            penalty += 0.2;
        }

        return {
            penalty: Math.min(0.5, penalty),
            reason: penalty > 0.3
                ? 'Высокие риски'
                : penalty > 0.15
                ? 'Средние риски'
                : 'Низкие риски'
        };
    }

    /**
     * Оценка приоритета
     */
    private assessPriority(proposal: Proposal): { score: number; reason?: string } {
        // Анализ описания для определения приоритета
        const text = `${proposal.title} ${proposal.description}`.toLowerCase();
        
        let score = 0.5;

        // Высокий приоритет
        if (text.includes('критич') || text.includes('critical') || 
            text.includes('срочн') || text.includes('urgent') ||
            text.includes('баг') || text.includes('bug') ||
            text.includes('ошибка') || text.includes('error')) {
            score = 0.9;
        }
        // Средний приоритет
        else if (text.includes('улучш') || text.includes('improve') ||
                 text.includes('оптимиз') || text.includes('optimize')) {
            score = 0.7;
        }
        // Низкий приоритет
        else if (text.includes('желательно') || text.includes('nice to have') ||
                 text.includes('будущ') || text.includes('future')) {
            score = 0.3;
        }

        return {
            score,
            reason: score > 0.7
                ? 'Высокий приоритет'
                : score > 0.4
                ? 'Средний приоритет'
                : 'Низкий приоритет'
        };
    }
}
