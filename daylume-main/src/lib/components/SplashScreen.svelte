<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut, elasticOut, backOut } from 'svelte/easing';
	
	export let onComplete: () => void = () => {};
	export let duration: number = 4500; // Total splash duration
	
	let mounted = false;
	let showLogo = false;
	let showTitle = false;
	let showSlogan = false;
	let showGlow = false;
	let isExiting = false;
	
	// Random spin direction
	let spinDirection = Math.random() > 0.5 ? 1 : -1;
	let spinSpeed = 8 + Math.random() * 4; // 8-12 seconds per rotation
	
	onMount(() => {
		mounted = true;
		
		// Staggered animation sequence
		setTimeout(() => showLogo = true, 100);
		setTimeout(() => showGlow = true, 600);
		setTimeout(() => showTitle = true, 1200);
		setTimeout(() => showSlogan = true, 2000);
		
		// Exit sequence
		setTimeout(() => {
			isExiting = true;
			setTimeout(onComplete, 800);
		}, duration);
	});
	
	// Custom easing for smooth rise
	function smoothRise(t: number): number {
		return 1 - Math.pow(1 - t, 4);
	}
</script>

{#if mounted && !isExiting}
	<div 
		class="splash-container"
		out:fade={{ duration: 800, easing: cubicOut }}
	>
		<!-- Animated Background -->
		<div class="splash-bg">
			<!-- Gradient orbs -->
			<div class="orb orb-1"></div>
			<div class="orb orb-2"></div>
			<div class="orb orb-3"></div>
			
			<!-- Particle field -->
			<div class="particles">
				{#each Array(20) as _, i}
					<div 
						class="particle"
						style="
							--delay: {Math.random() * 3}s;
							--x: {Math.random() * 100}%;
							--duration: {3 + Math.random() * 4}s;
							--size: {2 + Math.random() * 3}px;
						"
					></div>
				{/each}
			</div>
		</div>
		
		<!-- Main Content -->
		<div class="splash-content">
			<!-- Logo Container -->
			{#if showLogo}
				<div 
					class="logo-container"
					in:fly={{ y: 200, duration: 1200, easing: smoothRise }}
				>
					<!-- Glow effect behind logo -->
					{#if showGlow}
						<div 
							class="logo-glow"
							in:fade={{ duration: 800 }}
						></div>
					{/if}
					
					<!-- Spinning Logo -->
					<div 
						class="logo-spinner"
						style="--spin-direction: {spinDirection}; --spin-speed: {spinSpeed}s;"
					>
						<img 
							src="/assets/logo.png" 
							alt="Daylume" 
							class="logo-image"
						/>
					</div>
					
					<!-- Ring animations around logo -->
					<div class="logo-ring ring-1"></div>
					<div class="logo-ring ring-2"></div>
					<div class="logo-ring ring-3"></div>
				</div>
			{/if}
			
			<!-- Title "DAYLUME" -->
			{#if showTitle}
				<div 
					class="title-container"
					in:fly={{ y: -60, duration: 1000, easing: backOut }}
				>
					<h1 class="title">
						{#each 'DAYLUME'.split('') as letter, i}
							<span 
								class="letter"
								style="--delay: {i * 0.08}s"
							>
								{letter}
							</span>
						{/each}
					</h1>
				</div>
			{/if}
			
			<!-- Slogan -->
			{#if showSlogan}
				<div 
					class="slogan-container"
					in:fade={{ duration: 600 }}
				>
					<div class="slogan-wrapper">
						<span class="slogan-text">
							{#each 'Bring Your Day Into Focus'.split('') as char, i}
								<span 
									class="slogan-char"
									style="--char-delay: {i * 0.03}s"
								>{char === ' ' ? '\u00A0' : char}</span>
							{/each}
						</span>
						<div class="slogan-line"></div>
					</div>
				</div>
			{/if}
		</div>
		
		<!-- Bottom gradient fade -->
		<div class="bottom-fade"></div>
	</div>
{/if}

<style>
	.splash-container {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%);
		overflow: hidden;
	}
	
	/* Background Effects */
	.splash-bg {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}
	
	.orb {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		opacity: 0.4;
		animation: orbFloat 8s ease-in-out infinite;
	}
	
	.orb-1 {
		width: 400px;
		height: 400px;
		background: radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, transparent 70%);
		top: -100px;
		left: -100px;
		animation-delay: 0s;
	}
	
	.orb-2 {
		width: 500px;
		height: 500px;
		background: radial-gradient(circle, rgba(59, 130, 246, 0.5) 0%, transparent 70%);
		bottom: -150px;
		right: -150px;
		animation-delay: -3s;
	}
	
	.orb-3 {
		width: 300px;
		height: 300px;
		background: radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, transparent 70%);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		animation-delay: -5s;
	}
	
	@keyframes orbFloat {
		0%, 100% { transform: translate(0, 0) scale(1); }
		25% { transform: translate(30px, -30px) scale(1.1); }
		50% { transform: translate(-20px, 20px) scale(0.95); }
		75% { transform: translate(20px, 10px) scale(1.05); }
	}
	
	/* Particles */
	.particles {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}
	
	.particle {
		position: absolute;
		width: var(--size);
		height: var(--size);
		background: rgba(255, 255, 255, 0.6);
		border-radius: 50%;
		left: var(--x);
		bottom: -10px;
		animation: particleRise var(--duration) ease-out infinite;
		animation-delay: var(--delay);
		opacity: 0;
	}
	
	@keyframes particleRise {
		0% {
			opacity: 0;
			transform: translateY(0) scale(0);
		}
		10% {
			opacity: 1;
			transform: translateY(-50px) scale(1);
		}
		90% {
			opacity: 0.5;
		}
		100% {
			opacity: 0;
			transform: translateY(-100vh) scale(0.5);
		}
	}
	
	/* Main Content */
	.splash-content {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		z-index: 10;
	}
	
	/* Logo Container */
	.logo-container {
		position: relative;
		width: 140px;
		height: 140px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.logo-glow {
		position: absolute;
		inset: -40px;
		background: radial-gradient(circle, 
			rgba(139, 92, 246, 0.4) 0%, 
			rgba(59, 130, 246, 0.2) 40%, 
			transparent 70%
		);
		border-radius: 50%;
		animation: glowPulse 3s ease-in-out infinite;
	}
	
	@keyframes glowPulse {
		0%, 100% { 
			opacity: 0.6; 
			transform: scale(1); 
		}
		50% { 
			opacity: 1; 
			transform: scale(1.15); 
		}
	}
	
	.logo-spinner {
		position: relative;
		width: 120px;
		height: 120px;
		animation: logoSpin calc(var(--spin-speed)) linear infinite;
		animation-direction: normal;
		z-index: 5;
	}
	
	@keyframes logoSpin {
		from { 
			transform: rotate(0deg); 
		}
		to { 
			transform: rotate(calc(360deg * var(--spin-direction))); 
		}
	}
	
	.logo-image {
		width: 100%;
		height: 100%;
		object-fit: contain;
		filter: drop-shadow(0 0 30px rgba(139, 92, 246, 0.5));
	}
	
	/* Rings around logo */
	.logo-ring {
		position: absolute;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.1);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		animation: ringExpand 3s ease-out infinite;
	}
	
	.ring-1 {
		width: 160px;
		height: 160px;
		animation-delay: 0s;
	}
	
	.ring-2 {
		width: 200px;
		height: 200px;
		animation-delay: 1s;
	}
	
	.ring-3 {
		width: 240px;
		height: 240px;
		animation-delay: 2s;
	}
	
	@keyframes ringExpand {
		0% {
			opacity: 0.8;
			transform: translate(-50%, -50%) scale(0.8);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(1.5);
		}
	}
	
	/* Title */
	.title-container {
		position: relative;
		margin-top: 1rem;
	}
	
	.title {
		font-family: 'Poppins', 'Inter', sans-serif;
		font-size: 3.5rem;
		font-weight: 800;
		letter-spacing: 0.3em;
		margin: 0;
		display: flex;
		gap: 0.1em;
		background: linear-gradient(135deg, 
			#fff 0%, 
			#e0e7ff 25%, 
			#c7d2fe 50%, 
			#a5b4fc 75%, 
			#fff 100%
		);
		background-size: 200% 200%;
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		animation: shimmer 3s ease-in-out infinite;
		text-shadow: 0 0 60px rgba(139, 92, 246, 0.5);
	}
	
	.letter {
		display: inline-block;
		animation: letterDrop 0.6s ease-out forwards;
		animation-delay: var(--delay);
		opacity: 0;
		transform: translateY(-30px);
	}
	
	@keyframes letterDrop {
		0% {
			opacity: 0;
			transform: translateY(-30px) scale(0.8);
		}
		60% {
			opacity: 1;
			transform: translateY(5px) scale(1.05);
		}
		100% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	
	@keyframes shimmer {
		0%, 100% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
	}
	
	/* Slogan */
	.slogan-container {
		position: relative;
		margin-top: 0.5rem;
	}
	
	.slogan-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}
	
	.slogan-text {
		font-family: 'Inter', sans-serif;
		font-size: 1.1rem;
		font-weight: 300;
		letter-spacing: 0.15em;
		color: rgba(255, 255, 255, 0.8);
		display: flex;
	}
	
	.slogan-char {
		display: inline-block;
		opacity: 0;
		animation: charReveal 0.4s ease-out forwards;
		animation-delay: var(--char-delay);
	}
	
	@keyframes charReveal {
		0% {
			opacity: 0;
			transform: translateY(10px);
			filter: blur(4px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
			filter: blur(0);
		}
	}
	
	.slogan-line {
		width: 0;
		height: 1px;
		background: linear-gradient(90deg, 
			transparent 0%, 
			rgba(139, 92, 246, 0.6) 20%, 
			rgba(59, 130, 246, 0.8) 50%, 
			rgba(139, 92, 246, 0.6) 80%, 
			transparent 100%
		);
		animation: lineExpand 1s ease-out 0.8s forwards;
	}
	
	@keyframes lineExpand {
		0% { width: 0; }
		100% { width: 280px; }
	}
	
	/* Bottom Fade */
	.bottom-fade {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 150px;
		background: linear-gradient(to top, rgba(2, 6, 23, 0.8), transparent);
		pointer-events: none;
	}
	
	/* Responsive */
	@media (max-width: 480px) {
		.logo-container {
			width: 120px;
			height: 120px;
		}
		
		.logo-spinner {
			width: 100px;
			height: 100px;
		}
		
		.title {
			font-size: 2.5rem;
			letter-spacing: 0.2em;
		}
		
		.slogan-text {
			font-size: 0.9rem;
		}
		
		.ring-1 { width: 140px; height: 140px; }
		.ring-2 { width: 170px; height: 170px; }
		.ring-3 { width: 200px; height: 200px; }
	}
</style>
