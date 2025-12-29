import { Task } from './orchestrator';
import { AgentManager } from './agent-manager';

export class TaskPlanner {
    /**
     * Планирование выполнения задачи
     */
    async planTask(task: Task, agentManager: AgentManager): Promise<void> {
        console.log(`Planning task: ${task.id} - ${task.type}`);

        // Определение последовательности агентов для задачи
        const agentSequence = this.determineAgentSequence(task);
        
        // Назначение задачи первому агенту в последовательности
        if (agentSequence.length > 0) {
            task.assignedAgent = agentSequence[0];
            task.status = 'in-progress';
        }

        console.log(`Task ${task.id} assigned to ${task.assignedAgent}`);
    }

    /**
     * Определение последовательности агентов для задачи
     */
    private determineAgentSequence(task: Task): string[] {
        switch (task.type) {
            case 'feature':
                return ['architect', 'backend', 'frontend', 'qa'];
            case 'bug':
                return ['backend', 'qa', 'analyst'];
            case 'improvement':
                return ['analyst', 'backend', 'devops'];
            case 'refactoring':
                return ['architect', 'backend', 'qa'];
            case 'documentation':
                return ['architect'];
            case 'quality-check':
                // Для проверки качества оркестратор сам распределит задачи
                return ['orchestrator'];
            default:
                return ['backend'];
        }
    }
}
