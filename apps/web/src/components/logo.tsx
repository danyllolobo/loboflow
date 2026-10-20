import React from 'react';
import { useTheme } from '../contexts/theme-context';

interface LogoProps {
  className?: string;
  height?: number;
  width?: number;
}

export function LoboFlowLogo({ className = 'h-8 w-auto', height, width }: LogoProps) {
  const { resolvedTheme } = useTheme();

  // No tema escuro usamos a versão otimizada para fundo escuro.
  // No tema claro usamos a versão otimizada para fundo claro.
  const src =
    resolvedTheme === 'dark'
      ? '/loboflow-logo-dark.png'
      : '/loboflow-logo-light.png';

  return (
    <img
      src={src}
      alt="LoboFlow"
      className={`object-contain transition-opacity duration-200 ${className}`}
      height={height}
      width={width}
      loading="eager"
    />
  );
}
