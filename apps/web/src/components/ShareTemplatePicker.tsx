'use client';

import { useMemo, useState } from 'react';

type TemplateCard = {
  name: string;
  accentClassName: string;
  colors: [string, string];
  copy: string;
};

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

async function buildStoryImageFile(template: TemplateCard, publicLink: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, template.colors[0]);
  gradient.addColorStop(1, template.colors[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fillRect(70, 70, canvas.width - 140, canvas.height - 140);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '600 44px Inter, Arial, sans-serif';
  ctx.fillText(template.name.toUpperCase(), 120, 190);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 96px Inter, Arial, sans-serif';
  const lines = template.copy.split(' ');
  let currentLine = '';
  let y = 620;
  for (const word of lines) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(nextLine).width > 720) {
      ctx.fillText(currentLine, 120, y);
      currentLine = word;
      y += 110;
    } else {
      currentLine = nextLine;
    }
  }
  if (currentLine) {
    ctx.fillText(currentLine, 120, y);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.roundRect(120, 1380, 840, 180, 32);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 46px Inter, Arial, sans-serif';
  ctx.fillText(publicLink, 160, 1495, 760);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });

  if (!blob) throw new Error('Failed to generate story asset');
  return new File([blob], `${template.name.toLowerCase()}-story.png`, { type: 'image/png' });
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ShareTemplatePicker({
  publicLink,
  templates,
}: {
  publicLink: string;
  templates: TemplateCard[];
}) {
  const [status, setStatus] = useState('');
  const isMobile = useMemo(() => isMobileDevice(), []);

  async function handleTemplateClick(template: TemplateCard) {
    setStatus('');
    try {
      await copyToClipboard(publicLink);

      if (isMobile) {
        const file = await buildStoryImageFile(template, publicLink);
        const sharePayload = {
          title: `${template.name} story`,
          text: 'Your link is copied. Add it to your Instagram story link sticker.',
          files: [file],
        };

        if (navigator.canShare?.(sharePayload)) {
          await navigator.share(sharePayload);
          setStatus('Story asset opened in your share sheet. Your link is already copied.');
          return;
        }

        downloadFile(file);
        setStatus('Story asset downloaded. Your link is copied for the Instagram sticker.');
        return;
      }

      setStatus('Link copied. Use it wherever you share your page.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Unable to prepare your story asset');
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {templates.map((template) => (
          <button
            key={template.name}
            type="button"
            onClick={() => void handleTemplateClick(template)}
            className={`rounded-3xl bg-gradient-to-br ${template.accentClassName} p-5 text-left shadow-xl transition hover:scale-[1.01]`}
          >
            <div className="rounded-2xl bg-black/15 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">{template.name}</p>
              <p className="mt-10 text-2xl font-semibold text-white">{template.copy}</p>
              <div className="mt-10 rounded-2xl bg-white/15 px-3 py-2 text-sm text-white">
                {publicLink}
              </div>
            </div>
          </button>
        ))}
      </div>

      {status ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200">
          {status}
        </div>
      ) : null}
    </div>
  );
}
