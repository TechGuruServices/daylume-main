<script lang="ts">
    import { getTasks, getHabits, getHabitLogs, getHabitStreak } from '$lib/storage';
    import { onMount } from 'svelte';
    import type { Task, Habit, HabitLog } from '$lib/types';
    
    let stats = {
        tasksCompleted: 0,
        tasksPending: 0,
        habitsCompleted: 0,
        habitsTotal: 0,
        streak: 0,
        productivity: 0
    };
    
    onMount(() => {
        loadStats();
    });
    
    function loadStats() {
        const tasks = getTasks();
        const habits = getHabits();
        const habitLogs = getHabitLogs();
        const today = new Date().toISOString().split('T')[0];
        
        // Task stats
        const todaysTasks = tasks.filter((t: Task) => t.dueDate === today);
        stats.tasksCompleted = todaysTasks.filter((t: Task) => t.status === 'completed').length;
        stats.tasksPending = todaysTasks.filter((t: Task) => t.status !== 'completed').length;
        
        // Habit stats
        stats.habitsTotal = habits.length;
        const todayLogs = habitLogs.filter((l: HabitLog) => l.date === today);
        let completedToday = 0;
        
        for (const habit of habits) {
            const log = todayLogs.find((l: HabitLog) => l.habitId === habit.id);
            if (log && log.count >= habit.targetCount) {
                completedToday++;
            }
        }
        stats.habitsCompleted = completedToday;
        
        // Get best habit streak
        stats.streak = habits.reduce((best: number, habit: Habit) => {
            const s = getHabitStreak(habit.id);
            return s > best ? s : best;
        }, 0);
        
        // Calculate productivity score
        const taskScore = todaysTasks.length > 0 
            ? (stats.tasksCompleted / todaysTasks.length) * 100 
            : 100;
        const habitScore = stats.habitsTotal > 0 
            ? (stats.habitsCompleted / stats.habitsTotal) * 100 
            : 100;
        stats.productivity = Math.round((taskScore + habitScore) / 2);
    }
</script>

<div class="h-full flex flex-col gap-3">
    <!-- Productivity Score -->
    <div class="flex items-center justify-between">
        <span class="text-xs text-gray-400 uppercase tracking-wider">Productivity</span>
        <span class="text-lg font-bold text-primary">{stats.productivity}%</span>
    </div>
    
    <!-- Progress Bar -->
    <div class="h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
            class="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
            style="width: {stats.productivity}%"
        ></div>
    </div>
    
    <!-- Stats Grid -->
    <div class="grid grid-cols-2 gap-2 mt-auto">
        <div class="bg-white/5 rounded-xl p-2 text-center">
            <div class="text-lg font-bold text-success">{stats.tasksCompleted}</div>
            <div class="text-xs text-gray-400">Tasks Done</div>
        </div>
        <div class="bg-white/5 rounded-xl p-2 text-center">
            <div class="text-lg font-bold text-warning">{stats.tasksPending}</div>
            <div class="text-xs text-gray-400">Pending</div>
        </div>
        <div class="bg-white/5 rounded-xl p-2 text-center">
            <div class="text-lg font-bold text-primary">{stats.habitsCompleted}/{stats.habitsTotal}</div>
            <div class="text-xs text-gray-400">Habits</div>
        </div>
        <div class="bg-white/5 rounded-xl p-2 text-center">
            <div class="text-lg font-bold text-orange-400">🔥 {stats.streak}</div>
            <div class="text-xs text-gray-400">Streak</div>
        </div>
    </div>
</div>
