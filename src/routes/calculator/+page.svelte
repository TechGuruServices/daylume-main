<script lang="ts">
    import { onMount } from "svelte";
    import type { CalculationHistory } from "$lib/types";
    import {
        getCalculations,
        addCalculation,
        clearCalculations,
    } from "$lib/storage";
    import { showToast } from "$lib/toast";

    let display = "0";
    let previousValue = "";
    let operation: string | null = null;
    let shouldResetDisplay = false;
    let history: CalculationHistory[] = [];
    let showHistory = true;

    onMount(() => {
        history = getCalculations();
        window.addEventListener("keydown", handleKeyboard);

        return () => {
            window.removeEventListener("keydown", handleKeyboard);
        };
    });

    function handleKeyboard(e: KeyboardEvent) {
        const key = e.key;

        if (key >= "0" && key <= "9") {
            handleNumber(key);
        } else if (key === ".") {
            handleNumber(".");
        } else if (["+", "-", "*", "/"].includes(key)) {
            handleOperator(key === "*" ? "×" : key === "/" ? "÷" : key);
        } else if (key === "Enter" || key === "=") {
            e.preventDefault();
            handleEquals();
        } else if (key === "Escape") {
            handleClear();
        } else if (key === "Backspace") {
            handleBackspace();
        }
    }

    function handleNumber(num: string) {
        if (shouldResetDisplay) {
            display = num;
            shouldResetDisplay = false;
        } else {
            if (num === "." && display.includes(".")) return;
            display = display === "0" && num !== "." ? num : display + num;
        }
    }

    function handleOperator(op: string) {
        if (operation && !shouldResetDisplay) {
            handleEquals();
        }
        previousValue = display;
        operation = op;
        shouldResetDisplay = true;
    }

    function handleEquals() {
        if (!operation || !previousValue) return;

        const prev = parseFloat(previousValue);
        const current = parseFloat(display);
        let result: number;

        switch (operation) {
            case "+":
                result = prev + current;
                break;
            case "-":
                result = prev - current;
                break;
            case "×":
                result = prev * current;
                break;
            case "÷":
                result = current !== 0 ? prev / current : NaN;
                break;
            case "%":
                result = (prev * current) / 100;
                break;
            default:
                return;
        }

        if (isNaN(result) || !isFinite(result)) {
            showToast("error", "Invalid calculation");
            handleClear();
            return;
        }

        // Save to history
        const expression = `${previousValue} ${operation} ${display}`;
        const calculation: CalculationHistory = {
            id: Math.random().toString(36).substring(7),
            expression,
            result,
            timestamp: new Date().toISOString(),
        };
        addCalculation(calculation);
        history = getCalculations();

        display = result.toString();
        operation = null;
        previousValue = "";
        shouldResetDisplay = true;
    }

    function handleClear() {
        display = "0";
        previousValue = "";
        operation = null;
        shouldResetDisplay = false;
    }

    function handleBackspace() {
        if (display.length > 1) {
            display = display.slice(0, -1);
        } else {
            display = "0";
        }
    }

    function handlePercent() {
        const value = parseFloat(display);
        display = (value / 100).toString();
    }

    function handleSquareRoot() {
        const value = parseFloat(display);
        if (value < 0) {
            showToast(
                "error",
                "Cannot calculate square root of negative number",
            );
            return;
        }
        const result = Math.sqrt(value);

        const calculation: CalculationHistory = {
            id: Math.random().toString(36).substring(7),
            expression: `√${value}`,
            result,
            timestamp: new Date().toISOString(),
        };
        addCalculation(calculation);
        history = getCalculations();

        display = result.toString();
        shouldResetDisplay = true;
    }

    function handleSquare() {
        const value = parseFloat(display);
        const result = value * value;

        const calculation: CalculationHistory = {
            id: Math.random().toString(36).substring(7),
            expression: `${value}²`,
            result,
            timestamp: new Date().toISOString(),
        };
        addCalculation(calculation);
        history = getCalculations();

        display = result.toString();
        shouldResetDisplay = true;
    }

    function handleClearHistory() {
        if (confirm("Clear all calculation history?")) {
            clearCalculations();
            history = [];
            showToast("success", "History cleared");
        }
    }

    function useHistoryValue(value: number) {
        display = value.toString();
        shouldResetDisplay = true;
    }
</script>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <h2 class="text-3xl font-heading font-bold">Calculator</h2>
        <button
            on:click={() => (showHistory = !showHistory)}
            class="btn btn-secondary flex items-center gap-2"
        >
            <span class="mdi mdi-history"></span>
            {showHistory ? "Hide" : "Show"} History
        </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Calculator -->
        <div class="lg:col-span-2">
            <div class="glass-panel rounded-3xl p-6 md:p-8">
                <!-- Display -->
                <div
                    class="mb-8 p-6 bg-black/40 backdrop-blur-sm rounded-2xl border border-white/5 shadow-inner"
                >
                    <div
                        class="text-sm text-gray-400 h-6 mb-2 text-right font-mono"
                    >
                        {#if operation}
                            {previousValue} {operation}
                        {/if}
                    </div>
                    <div
                        class="text-5xl font-bold text-right break-all font-mono tracking-wider text-white"
                    >
                        {display}
                    </div>
                </div>

                <!-- Buttons -->
                <div class="grid grid-cols-4 gap-4">
                    <!-- Row 1 -->
                    <button
                        on:click={handleClear}
                        aria-label="Clear calculator"
                        class="btn bg-danger/20 text-danger hover:bg-danger hover:text-white col-span-2 text-xl py-5 rounded-2xl border border-danger/20 transition-all"
                    >
                        C
                    </button>
                    <button
                        on:click={handleBackspace}
                        aria-label="Delete last digit"
                        class="btn btn-secondary text-xl py-5 rounded-2xl"
                    >
                        <span class="mdi mdi-backspace-outline"></span>
                    </button>
                    <button
                        on:click={() => handleOperator("÷")}
                        class="btn bg-primary/20 text-primary hover:bg-primary hover:text-white text-xl py-5 rounded-2xl border border-primary/20 transition-all"
                    >
                        ÷
                    </button>

                    <!-- Row 2 -->
                    <button
                        on:click={() => handleNumber("7")}
                        class="btn btn-secondary text-xl py-5 rounded-2xl font-bold"
                        >7</button
                    >
                    <button
                        on:click={() => handleNumber("8")}
                        class="btn btn-secondary text-xl py-5 rounded-2xl font-bold"
                        >8</button
                    >
                    <button
                        on:click={() => handleNumber("9")}
                        class="btn btn-secondary text-xl py-5 rounded-2xl font-bold"
                        >9</button
                    >
                    <button
                        on:click={() => handleOperator("×")}
                        class="btn bg-primary/20 text-primary hover:bg-primary hover:text-white text-xl py-5 rounded-2xl border border-primary/20 transition-all"
                    >
                        ×
                    </button>

                    <!-- Row 3 -->
                    <button
                        on:click={() => handleNumber("4")}
                        class="btn btn-secondary text-xl py-5 rounded-2xl font-bold"
                        >4</button
                    >
                    <button
                        on:click={() => handleNumber("5")}
                        class="btn btn-secondary text-xl py-5 rounded-2xl font-bold"
                        >5</button
                    >
                    <button
                        on:click={() => handleNumber("6")}
                        class="btn btn-secondary text-xl py-5 rounded-2xl font-bold"
                        >6</button
                    >
                    <button
                        on:click={() => handleOperator("-")}
                        class="btn bg-primary/20 text-primary hover:bg-primary hover:text-white text-xl py-5 rounded-2xl border border-primary/20 transition-all"
                    >
                        -
                    </button>

                    <!-- Row 4 -->
                    <button
                        on:click={() => handleNumber("1")}
                        class="btn btn-secondary text-xl py-5 rounded-2xl font-bold"
                        >1</button
                    >
                    <button
                        on:click={() => handleNumber("2")}
                        class="btn btn-secondary text-xl py-5 rounded-2xl font-bold"
                        >2</button
                    >
                    <button
                        on:click={() => handleNumber("3")}
                        class="btn btn-secondary text-xl py-5 rounded-2xl font-bold"
                        >3</button
                    >
                    <button
                        on:click={() => handleOperator("+")}
                        class="btn bg-primary/20 text-primary hover:bg-primary hover:text-white text-xl py-5 rounded-2xl border border-primary/20 transition-all"
                    >
                        +
                    </button>

                    <!-- Row 5 -->
                    <button
                        on:click={() => handleNumber("0")}
                        class="btn btn-secondary text-xl py-5 col-span-2 rounded-2xl font-bold"
                        >0</button
                    >
                    <button
                        on:click={() => handleNumber(".")}
                        class="btn btn-secondary text-xl py-5 rounded-2xl font-bold"
                        >.</button
                    >
                    <button
                        on:click={handleEquals}
                        class="btn bg-success hover:bg-success-dark text-white text-xl py-5 rounded-2xl shadow-lg shadow-success/20 transition-all"
                    >
                        =
                    </button>

                    <!-- Row 6 - Advanced -->
                    <button
                        on:click={handlePercent}
                        class="btn bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl border border-white/5"
                        >%</button
                    >
                    <button
                        on:click={handleSquareRoot}
                        class="btn bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl border border-white/5"
                        >√</button
                    >
                    <button
                        on:click={handleSquare}
                        class="btn bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl border border-white/5"
                        >x²</button
                    >
                    <button
                        class="btn bg-white/5 text-gray-500 rounded-2xl border border-white/5 cursor-not-allowed opacity-50"
                        >+/-</button
                    >
                </div>

                <div
                    class="mt-6 text-xs text-gray-500 text-center flex items-center justify-center gap-2"
                >
                    <span class="mdi mdi-keyboard-outline"></span>
                    Shortcuts: Numbers, +, -, *, /, Enter (=), Esc (C)
                </div>
            </div>
        </div>

        <!-- History -->
        {#if showHistory}
            <div class="lg:col-span-1">
                <div class="glass-panel rounded-3xl p-6 h-full flex flex-col">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-xl font-heading font-bold">History</h3>
                        {#if history.length > 0}
                            <button
                                on:click={handleClearHistory}
                                class="text-xs font-medium text-danger hover:text-danger-dark px-3 py-1 rounded-full bg-danger/10 hover:bg-danger/20 transition-colors"
                            >
                                Clear All
                            </button>
                        {/if}
                    </div>

                    <div
                        class="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2"
                    >
                        {#each history.slice().reverse() as calc (calc.id)}
                            <button
                                on:click={() => useHistoryValue(calc.result)}
                                class="w-full text-left p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
                            >
                                <div
                                    class="text-sm text-gray-400 font-mono mb-1"
                                >
                                    {calc.expression}
                                </div>
                                <div
                                    class="text-xl font-bold text-white font-mono group-hover:text-primary transition-colors"
                                >
                                    {calc.result}
                                </div>
                                <div
                                    class="text-[10px] text-gray-500 mt-2 flex items-center gap-1"
                                >
                                    <span class="mdi mdi-clock-outline"></span>
                                    {new Date(
                                        calc.timestamp,
                                    ).toLocaleTimeString()}
                                </div>
                            </button>
                        {:else}
                            <div
                                class="flex flex-col items-center justify-center h-64 text-gray-500"
                            >
                                <span
                                    class="mdi mdi-history text-4xl mb-2 opacity-50"
                                ></span>
                                <p>No calculations yet</p>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>
