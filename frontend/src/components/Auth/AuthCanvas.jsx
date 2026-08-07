import React, { useEffect, useRef } from 'react';

export default function AuthCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const mouse = { x: width / 2, y: height / 2, radius: 220, active: false };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Particle constellation system
    const numParticles = Math.min(Math.floor((width * height) / 10000), 90);
    const particles = [];
    const colors = ['#6366f1', '#8b5cf6', '#d946ef', '#06b6d4', '#3b82f6'];

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.8 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        originalVx: (Math.random() - 0.5) * 0.7,
        originalVy: (Math.random() - 0.5) * 0.7,
        pulseSpeed: Math.random() * 0.03 + 0.015,
        pulseAlpha: Math.random() * Math.PI * 2
      });
    }

    let waveOffset = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      waveOffset += 0.005;

      // Draw subtle animated glowing geometric grid lines
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Render particle interactions
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        // Wave dynamics
        p1.x += p1.vx + Math.sin(waveOffset + p1.y * 0.002) * 0.2;
        p1.y += p1.vy + Math.cos(waveOffset + p1.x * 0.002) * 0.2;

        // Wall bounds
        if (p1.x < 0 || p1.x > width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > height) p1.vy *= -1;

        // Interactive mouse gravity / magnetic field
        if (mouse.active) {
          const dx = mouse.x - p1.x;
          const dy = mouse.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            const angle = Math.atan2(dy, dx);
            p1.x -= Math.cos(angle) * force * 2.2;
            p1.y -= Math.sin(angle) * force * 2.2;
          }
        }

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const distx = p1.x - p2.x;
          const disty = p1.y - p2.y;
          const distance = Math.sqrt(distx * distx + disty * disty);

          if (distance < 160) {
            const alpha = (1 - distance / 160) * 0.3;
            const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            grad.addColorStop(0, p1.color);
            grad.addColorStop(1, p2.color);

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = grad;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
          }
        }

        // Pulse opacity & scale
        p1.pulseAlpha += p1.pulseSpeed;
        const currentAlpha = 0.4 + Math.sin(p1.pulseAlpha) * 0.45;
        const currentRadius = p1.radius * (1 + Math.sin(p1.pulseAlpha) * 0.2);

        // Draw node dot
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = p1.color;
        ctx.globalAlpha = currentAlpha;
        ctx.shadowBlur = 14;
        ctx.shadowColor = p1.color;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="auth-canvas" />;
}
