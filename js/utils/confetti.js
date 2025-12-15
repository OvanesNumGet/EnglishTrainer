import { state } from '../state/store.js';

// ============ Confetti ============
export function launchConfetti() {
  if (state.settings && state.settings.reduceMotion) return;
  if (state.settings && !state.settings.confetti) return;

  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = [];
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  for (let i = 0; i < 150; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: canvas.height,
      r: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.floor(Math.random() * 10) - 10,
      tiltAngle: 0,
      tiltAngleInc: Math.random() * 0.07 + 0.05,
      vy: -(Math.random() * 15 + 7),
      vx: Math.random() * 6 - 3,
      gravity: 0.4
    });
  }

  let frame = 0;
  const maxFrames = 250;
  ctx.globalAlpha = 1;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (frame > maxFrames - 50) {
      ctx.globalAlpha = (maxFrames - frame) / 50;
    }

    pieces.forEach((p) => {
      ctx.beginPath();
      ctx.lineWidth = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
      ctx.stroke();

      p.tiltAngle += p.tiltAngleInc;
      p.tilt = Math.sin(p.tiltAngle) * 15;
      p.vy += p.gravity;
      p.y += p.vy;
      p.x += p.vx;
    });

    frame++;
    if (frame < maxFrames) {
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }
  }
  draw();
}

// Backward compatibility: some code may call it from DevTools
window.launchConfetti = launchConfetti;
