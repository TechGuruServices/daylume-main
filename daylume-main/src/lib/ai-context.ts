/**
 * AI Context Provider
 * Provides context-aware data for intelligent AI suggestions
 */

import { getTasks, getHabits, getHabitLogs, getActiveGoals, getJournalEntries } from './storage';
import type { Task, Habit, HabitLog, Goal, JournalEntry } from './types';

export interface AIContext {
    currentTime: string;
    dayOfWeek: string;
    dateFormatted: string;
    
    // Task context
    pendingTasks: number;
    overdueTasks: number;
    tasksCompletedToday: number;
    upcomingTasks: { title: string; dueDate?: string; priority: string }[];
    
    // Habit context
    habitsToday: { title: string; completed: boolean; streak: number }[];
    habitCompletionRate: number;
    
    // Goal context
    activeGoals: { title: string; progress: number; category: string }[];
    
    // Journal context
    recentMoods: string[];
    journalStreak: number;
    lastJournalDate?: string;
    
    // Productivity insights
    productivityScore: number;
    suggestions: string[];
}

/**
 * Get the current user context for AI
 */
export function getAIContext(): AIContext {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const hour = now.getHours();
    
    // Get all data
    const tasks = getTasks();
    const habits = getHabits();
    const habitLogs = getHabitLogs();
    const goals = getActiveGoals();
    const journalEntries = getJournalEntries();
    
    // Task analysis
    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in-progress');
    const overdueTasks = tasks.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        return t.dueDate < todayStr;
    });
    const tasksCompletedToday = tasks.filter(t => 
        t.status === 'completed' && t.completedAt?.startsWith(todayStr)
    ).length;
    
    // Upcoming tasks (next 7 days)
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const upcomingTasks = pendingTasks
        .filter(t => t.dueDate && t.dueDate >= todayStr && t.dueDate <= weekFromNow)
        .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
        .slice(0, 5)
        .map(t => ({ title: t.title, dueDate: t.dueDate, priority: t.priority }));
    
    // Habit analysis
    const todayLogs = habitLogs.filter(l => l.date === todayStr);
    const habitsToday = habits.map(h => {
        const log = todayLogs.find(l => l.habitId === h.id);
        const completed = log ? log.count >= h.targetCount : false;
        
        // Calculate streak
        let streak = 0;
        let checkDate = new Date(now);
        for (let i = 0; i < 365; i++) {
            const dateStr = checkDate.toISOString().split('T')[0];
            const dayLog = habitLogs.find(l => l.habitId === h.id && l.date === dateStr);
            if (dayLog && dayLog.count >= h.targetCount) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else if (i > 0) {
                break;
            } else {
                checkDate.setDate(checkDate.getDate() - 1);
            }
        }
        
        return { title: h.title, completed, streak };
    });
    
    const completedHabitsToday = habitsToday.filter(h => h.completed).length;
    const habitCompletionRate = habits.length > 0 
        ? Math.round((completedHabitsToday / habits.length) * 100) 
        : 0;
    
    // Goal analysis
    const activeGoals = goals.slice(0, 3).map(g => ({
        title: g.title,
        progress: g.progress,
        category: g.category
    }));
    
    // Journal analysis
    const sortedJournal = [...journalEntries].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const recentMoods = sortedJournal.slice(0, 7).map(e => e.mood).filter(Boolean) as string[];
    const lastJournalDate = sortedJournal[0]?.date;
    
    // Calculate journal streak
    let journalStreak = 0;
    let checkDate = new Date(now);
    for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const hasEntry = journalEntries.some(e => e.date === dateStr);
        if (hasEntry) {
            journalStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else if (i > 0) {
            break;
        } else {
            checkDate.setDate(checkDate.getDate() - 1);
        }
    }
    
    // Calculate productivity score (0-100)
    let productivityScore = 50; // Base score
    productivityScore += Math.min(tasksCompletedToday * 5, 20); // Up to 20 points for tasks
    productivityScore += Math.min(habitCompletionRate * 0.2, 20); // Up to 20 points for habits
    productivityScore -= Math.min(overdueTasks.length * 3, 15); // Deduct for overdue
    productivityScore += lastJournalDate === todayStr ? 10 : 0; // 10 points for journaling today
    productivityScore = Math.max(0, Math.min(100, productivityScore));
    
    // Generate smart suggestions
    const suggestions = generateSuggestions({
        hour,
        pendingTasksCount: pendingTasks.length,
        overdueCount: overdueTasks.length,
        habitCompletionRate,
        habitsToday,
        lastJournalDate,
        todayStr,
        recentMoods
    });
    
    return {
        currentTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
        dateFormatted: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        pendingTasks: pendingTasks.length,
        overdueTasks: overdueTasks.length,
        tasksCompletedToday,
        upcomingTasks,
        habitsToday,
        habitCompletionRate,
        activeGoals,
        recentMoods,
        journalStreak,
        lastJournalDate,
        productivityScore,
        suggestions
    };
}

interface SuggestionParams {
    hour: number;
    pendingTasksCount: number;
    overdueCount: number;
    habitCompletionRate: number;
    habitsToday: { title: string; completed: boolean; streak: number }[];
    lastJournalDate?: string;
    todayStr: string;
    recentMoods: string[];
}

function generateSuggestions(params: SuggestionParams): string[] {
    const suggestions: string[] = [];
    const { hour, pendingTasksCount, overdueCount, habitCompletionRate, habitsToday, lastJournalDate, todayStr, recentMoods } = params;
    
    // Time-based suggestions
    if (hour >= 6 && hour < 10) {
        suggestions.push("🌅 Start your day by reviewing today's priorities");
        if (habitsToday.some(h => !h.completed)) {
            suggestions.push("☀️ Morning is a great time to complete your daily habits");
        }
    } else if (hour >= 10 && hour < 12) {
        suggestions.push("🎯 Focus on your most important task now - your energy is at its peak");
    } else if (hour >= 12 && hour < 14) {
        suggestions.push("🍽️ Take a proper break - stepping away boosts afternoon productivity");
    } else if (hour >= 14 && hour < 17) {
        if (pendingTasksCount > 3) {
            suggestions.push("📋 Afternoon push: Try to complete 2-3 smaller tasks before end of day");
        }
    } else if (hour >= 17 && hour < 21) {
        if (lastJournalDate !== todayStr) {
            suggestions.push("📝 Evening reflection: Write in your journal about today");
        }
        const incompleteHabits = habitsToday.filter(h => !h.completed);
        if (incompleteHabits.length > 0) {
            suggestions.push(`⏰ Don't forget: ${incompleteHabits[0].title} is still pending`);
        }
    } else if (hour >= 21 || hour < 6) {
        suggestions.push("🌙 Plan tomorrow's top 3 priorities before bed");
    }
    
    // Overdue tasks
    if (overdueCount > 0) {
        suggestions.push(`⚠️ You have ${overdueCount} overdue task${overdueCount > 1 ? 's' : ''} - consider rescheduling or completing them`);
    }
    
    // Habit streaks at risk
    const streaksAtRisk = habitsToday.filter(h => !h.completed && h.streak >= 3);
    if (streaksAtRisk.length > 0) {
        suggestions.push(`🔥 Don't break your ${streaksAtRisk[0].streak}-day streak on "${streaksAtRisk[0].title}"!`);
    }
    
    // Mood patterns
    const negativeMoods = ['😢', '😡', '😰'];
    const recentNegative = recentMoods.filter(m => negativeMoods.includes(m)).length;
    if (recentNegative >= 3) {
        suggestions.push("💙 I notice some challenging days recently. Consider scheduling self-care time");
    }
    
    // Habit completion encouragement
    if (habitCompletionRate === 100) {
        suggestions.push("🌟 Amazing! All habits completed - you're on fire today!");
    } else if (habitCompletionRate >= 80) {
        suggestions.push("💪 Great progress on habits! Just a bit more to go");
    }
    
    return suggestions.slice(0, 3); // Limit to 3 suggestions
}

/**
 * Build system prompt with context
 */
export function buildContextualSystemPrompt(): string {
    const ctx = getAIContext();
    
    return `You are Daylume, a friendly and intelligent personal productivity assistant. You help users manage their daily life, tasks, habits, and goals.

CURRENT CONTEXT:
- Time: ${ctx.currentTime} on ${ctx.dayOfWeek}, ${ctx.dateFormatted}
- Pending tasks: ${ctx.pendingTasks} (${ctx.overdueTasks} overdue)
- Tasks completed today: ${ctx.tasksCompletedToday}
- Habit completion: ${ctx.habitCompletionRate}%
- Active goals: ${ctx.activeGoals.length}
- Journal streak: ${ctx.journalStreak} days
- Productivity score: ${ctx.productivityScore}/100

UPCOMING TASKS:
${ctx.upcomingTasks.length > 0 
    ? ctx.upcomingTasks.map(t => `- ${t.title} (${t.priority} priority${t.dueDate ? `, due ${t.dueDate}` : ''})`).join('\n')
    : '- No upcoming tasks scheduled'}

TODAY'S HABITS:
${ctx.habitsToday.length > 0
    ? ctx.habitsToday.map(h => `- ${h.completed ? '✅' : '⬜'} ${h.title} (${h.streak} day streak)`).join('\n')
    : '- No habits configured'}

SMART SUGGESTIONS:
${ctx.suggestions.join('\n')}

GUIDELINES:
- Be concise but warm and encouraging
- Use the context to give personalized advice
- Suggest specific actions when appropriate
- Celebrate wins and progress
- Be empathetic about challenges
- When asked about tasks/habits/goals, reference the actual data above
- If user seems stressed, prioritize wellbeing over productivity`;
}

/**
 * Generate journal prompts based on context
 */
export function generateJournalPrompts(): string[] {
    const ctx = getAIContext();
    const prompts: string[] = [];
    const hour = new Date().getHours();
    
    // Morning prompts
    if (hour >= 5 && hour < 12) {
        prompts.push("What are you most looking forward to today?");
        prompts.push("What's one thing you're grateful for this morning?");
        prompts.push("What would make today feel successful?");
    }
    // Afternoon prompts
    else if (hour >= 12 && hour < 17) {
        prompts.push("How is your day going so far?");
        prompts.push("What's been the highlight of your day?");
        if (ctx.tasksCompletedToday > 0) {
            prompts.push(`You've completed ${ctx.tasksCompletedToday} task(s) - how do you feel about your progress?`);
        }
    }
    // Evening prompts
    else {
        prompts.push("What was the best part of your day?");
        prompts.push("What did you learn today?");
        prompts.push("What are you grateful for today?");
        if (ctx.habitCompletionRate >= 80) {
            prompts.push("You crushed your habits today! How does that feel?");
        }
    }
    
    // Context-based prompts
    if (ctx.overdueTasks > 0) {
        prompts.push("What's been blocking you from completing your tasks?");
    }
    
    if (ctx.recentMoods.length > 0) {
        const lastMood = ctx.recentMoods[0];
        if (['😢', '😡', '😰'].includes(lastMood)) {
            prompts.push("How are you feeling today compared to yesterday?");
        }
    }
    
    return prompts.slice(0, 4);
}

/**
 * Generate smart scheduling suggestions
 */
export function getSchedulingSuggestions(taskTitle: string): { time: string; reason: string }[] {
    const hour = new Date().getHours();
    const suggestions: { time: string; reason: string }[] = [];
    
    const title = taskTitle.toLowerCase();
    
    // Deep work tasks
    if (title.includes('write') || title.includes('plan') || title.includes('design') || title.includes('think')) {
        suggestions.push({ time: '09:00', reason: 'Morning hours are best for deep, creative work' });
        suggestions.push({ time: '10:30', reason: 'Peak cognitive performance window' });
    }
    
    // Meetings/calls
    if (title.includes('meeting') || title.includes('call') || title.includes('discuss')) {
        suggestions.push({ time: '14:00', reason: 'Post-lunch is ideal for collaborative work' });
        suggestions.push({ time: '11:00', reason: 'Before lunch meetings tend to be shorter' });
    }
    
    // Exercise/health
    if (title.includes('exercise') || title.includes('gym') || title.includes('workout') || title.includes('run')) {
        suggestions.push({ time: '07:00', reason: 'Morning exercise boosts energy all day' });
        suggestions.push({ time: '17:30', reason: 'Evening workout helps decompress' });
    }
    
    // Default suggestions
    if (suggestions.length === 0) {
        if (hour < 12) {
            suggestions.push({ time: '10:00', reason: 'Morning focus time' });
        } else if (hour < 17) {
            suggestions.push({ time: '15:00', reason: 'Afternoon task block' });
        } else {
            suggestions.push({ time: '09:00', reason: 'Schedule for tomorrow morning' });
        }
    }
    
    return suggestions.slice(0, 2);
}

/**
 * Get weekly AI summary data
 */
export function getWeeklySummaryData() {
    const tasks = getTasks();
    const habits = getHabits();
    const habitLogs = getHabitLogs();
    const journalEntries = getJournalEntries();
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    
    // Tasks this week
    const tasksCompletedThisWeek = tasks.filter(t => 
        t.status === 'completed' && 
        t.completedAt && 
        t.completedAt >= weekAgoStr
    ).length;
    
    const tasksCreatedThisWeek = tasks.filter(t => 
        t.createdAt >= weekAgoStr
    ).length;
    
    // Habit completion this week
    const weekLogs = habitLogs.filter(l => l.date >= weekAgoStr);
    const totalPossibleHabits = habits.length * 7;
    const completedHabits = weekLogs.reduce((acc, l) => {
        const habit = habits.find(h => h.id === l.habitId);
        if (habit && l.count >= habit.targetCount) return acc + 1;
        return acc;
    }, 0);
    const weeklyHabitRate = totalPossibleHabits > 0 
        ? Math.round((completedHabits / totalPossibleHabits) * 100)
        : 0;
    
    // Journal entries this week
    const journalThisWeek = journalEntries.filter(e => e.date >= weekAgoStr);
    const moodsThisWeek = journalThisWeek.map(e => e.mood).filter(Boolean);
    
    // Most common mood
    const moodCounts: Record<string, number> = {};
    moodsThisWeek.forEach(m => {
        if (m) moodCounts[m] = (moodCounts[m] || 0) + 1;
    });
    const dominantMood = Object.entries(moodCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || '😊';
    
    return {
        tasksCompleted: tasksCompletedThisWeek,
        tasksCreated: tasksCreatedThisWeek,
        habitCompletionRate: weeklyHabitRate,
        journalEntries: journalThisWeek.length,
        dominantMood,
        totalHabitsTracked: completedHabits
    };
}

// ============================================
// TYPES AND HELPERS FOR AI CHAT COMPONENT
// ============================================

export interface Suggestion {
    title: string;
    description: string;
    action: string;
    category: 'productivity' | 'wellness' | 'task' | 'habit' | 'goal' | 'schedule' | 'reflection';
}

export interface JournalPrompt {
    prompt: string;
    category: 'morning' | 'afternoon' | 'evening' | 'reflection' | 'gratitude' | 'growth';
    context?: string;
}

export interface SchedulingSuggestion {
    suggestion: string;
    reason: string;
    timeSlot?: string;
    priority: 'high' | 'medium' | 'low';
}

/**
 * Get smart suggestions for the AI chat sidebar
 */
export function getSuggestions(): Suggestion[] {
    const ctx = getAIContext();
    const suggestions: Suggestion[] = [];
    const hour = new Date().getHours();
    
    // Time-based suggestions
    if (hour >= 5 && hour < 10) {
        suggestions.push({
            title: 'Plan Your Day',
            description: 'Start with a clear focus for today',
            action: 'Help me plan my top 3 priorities for today',
            category: 'productivity'
        });
    }
    
    // Overdue task suggestions
    if (ctx.overdueTasks > 0) {
        suggestions.push({
            title: 'Clear Overdue Tasks',
            description: `You have ${ctx.overdueTasks} overdue task${ctx.overdueTasks > 1 ? 's' : ''}`,
            action: 'Help me tackle my overdue tasks - which should I prioritize?',
            category: 'task'
        });
    }
    
    // Habit suggestions
    const incompleteHabits = ctx.habitsToday.filter(h => !h.completed);
    if (incompleteHabits.length > 0) {
        suggestions.push({
            title: 'Complete Your Habits',
            description: `${incompleteHabits.length} habit${incompleteHabits.length > 1 ? 's' : ''} remaining today`,
            action: `Remind me to complete my remaining habits: ${incompleteHabits.map(h => h.title).join(', ')}`,
            category: 'habit'
        });
    }
    
    // Streak protection
    const streaksAtRisk = ctx.habitsToday.filter(h => !h.completed && h.streak >= 3);
    if (streaksAtRisk.length > 0) {
        suggestions.push({
            title: 'Protect Your Streak! 🔥',
            description: `"${streaksAtRisk[0].title}" has a ${streaksAtRisk[0].streak}-day streak`,
            action: `I need motivation to keep my ${streaksAtRisk[0].streak}-day streak on ${streaksAtRisk[0].title}`,
            category: 'habit'
        });
    }
    
    // Goal check-in
    if (ctx.activeGoals.length > 0) {
        const lowProgressGoal = ctx.activeGoals.find(g => g.progress < 30);
        if (lowProgressGoal) {
            suggestions.push({
                title: 'Goal Check-In',
                description: `"${lowProgressGoal.title}" needs attention`,
                action: `Help me make progress on my goal: ${lowProgressGoal.title}`,
                category: 'goal'
            });
        }
    }
    
    // Wellness check
    const negativeMoods = ['😢', '😡', '😰'];
    const recentNegative = ctx.recentMoods.filter(m => negativeMoods.includes(m)).length;
    if (recentNegative >= 2) {
        suggestions.push({
            title: 'Wellness Check',
            description: 'I noticed some tough days recently',
            action: 'I\'ve been feeling stressed lately. Can you suggest some self-care activities?',
            category: 'wellness'
        });
    }
    
    // Evening reflection
    if (hour >= 18 && hour < 23) {
        suggestions.push({
            title: 'Evening Reflection',
            description: 'Review your day and plan tomorrow',
            action: 'Help me reflect on what went well today and plan for tomorrow',
            category: 'reflection'
        });
    }
    
    // Productivity boost
    if (ctx.productivityScore < 40) {
        suggestions.push({
            title: 'Productivity Boost',
            description: 'Get back on track with small wins',
            action: 'I\'m feeling unproductive. What small task can I do right now to build momentum?',
            category: 'productivity'
        });
    }
    
    return suggestions.slice(0, 6);
}

/**
 * Get journal prompts for the AI chat sidebar
 */
export function getJournalPrompts(): JournalPrompt[] {
    const prompts = generateJournalPrompts();
    const ctx = getAIContext();
    const hour = new Date().getHours();
    
    let category: JournalPrompt['category'] = 'reflection';
    if (hour >= 5 && hour < 12) category = 'morning';
    else if (hour >= 12 && hour < 17) category = 'afternoon';
    else category = 'evening';
    
    const journalPrompts: JournalPrompt[] = prompts.map(prompt => ({
        prompt,
        category,
        context: ctx.tasksCompletedToday > 0 
            ? `You've completed ${ctx.tasksCompletedToday} tasks today`
            : undefined
    }));
    
    // Add gratitude prompt
    journalPrompts.push({
        prompt: 'What are three things you\'re grateful for right now?',
        category: 'gratitude'
    });
    
    // Add growth prompt
    journalPrompts.push({
        prompt: 'What\'s one lesson you learned recently that you want to remember?',
        category: 'growth'
    });
    
    return journalPrompts.slice(0, 5);
}

/**
 * Get smart scheduling suggestions for tasks
 */
export function getSmartSchedulingSuggestions(): SchedulingSuggestion[] {
    const ctx = getAIContext();
    const suggestions: SchedulingSuggestion[] = [];
    const hour = new Date().getHours();
    
    // High priority for overdue
    if (ctx.overdueTasks > 0) {
        suggestions.push({
            suggestion: 'Schedule overdue tasks first thing tomorrow',
            reason: 'Clear your backlog to reduce mental load',
            timeSlot: '09:00 AM',
            priority: 'high'
        });
    }
    
    // Deep work scheduling
    if (hour < 10) {
        suggestions.push({
            suggestion: 'Block 2 hours for deep work this morning',
            reason: 'Morning hours have highest cognitive performance',
            timeSlot: '10:00 AM - 12:00 PM',
            priority: 'high'
        });
    }
    
    // Habit timing
    const incompleteHabits = ctx.habitsToday.filter(h => !h.completed);
    if (incompleteHabits.length > 0 && hour < 20) {
        suggestions.push({
            suggestion: `Complete "${incompleteHabits[0].title}" now`,
            reason: 'Building consistency is easier with immediate action',
            timeSlot: 'Right now',
            priority: incompleteHabits[0].streak >= 3 ? 'high' : 'medium'
        });
    }
    
    // Task batching
    if (ctx.pendingTasks >= 5) {
        suggestions.push({
            suggestion: 'Batch similar tasks together',
            reason: 'Reduces context switching and improves focus',
            timeSlot: 'Afternoon block',
            priority: 'medium'
        });
    }
    
    // Break reminder
    if (hour >= 14 && hour <= 16) {
        suggestions.push({
            suggestion: 'Take a 15-minute walk break',
            reason: 'Afternoon movement boosts energy and creativity',
            timeSlot: '3:00 PM',
            priority: 'low'
        });
    }
    
    // Evening planning
    if (hour >= 18 && hour <= 21) {
        suggestions.push({
            suggestion: 'Plan tomorrow\'s top 3 tasks',
            reason: 'Evening planning leads to focused mornings',
            timeSlot: 'Before bed',
            priority: 'medium'
        });
    }
    
    return suggestions.slice(0, 5);
}

/**
 * Generate weekly AI summary using the AI provider
 */
export async function generateWeeklySummary(aiSettings: any): Promise<{ summary: string; error?: string }> {
    const data = getWeeklySummaryData();
    const { generateAIContent } = await import('./ai-providers');
    
    const prompt = `Generate a brief, encouraging weekly summary based on this data:
- Tasks completed: ${data.tasksCompleted}
- Tasks created: ${data.tasksCreated}  
- Habit completion rate: ${data.habitCompletionRate}%
- Journal entries: ${data.journalEntries}
- Dominant mood: ${data.dominantMood}

Write 3-4 short paragraphs:
1. Highlight wins and accomplishments
2. Note patterns or areas for improvement
3. Suggest 1-2 specific focus areas for next week
4. End with an encouraging message

Keep it personal, warm, and actionable. Use emojis sparingly.`;

    const systemPrompt = 'You are a supportive productivity coach. Be concise, specific, and encouraging.';
    
    const result = await generateAIContent(prompt, aiSettings, systemPrompt);
    
    if (result.error) {
        return { summary: '', error: result.error };
    }
    
    return { summary: result.message };
}
