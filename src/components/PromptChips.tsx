import type { PromptPreset } from '../lib/types';
import {
  Box,
  Lightbulb,
  Camera,
  Paintbrush,
  Armchair,
  TreePine,
  Home,
  Gem,
} from 'lucide-react';

const presets: PromptPreset[] = [
  {
    id: '1',
    name: 'Simple Object',
    icon: 'box',
    prompt: 'Create a detailed medieval treasure chest with metal bands, a lock, and wooden planks. Use proper materials for wood and metal.',
    category: 'modeling',
  },
  {
    id: '2',
    name: 'Room Scene',
    icon: 'home',
    prompt: 'Create a modern minimalist living room with a sofa, coffee table, rug, floor lamp, and a large window. Use warm lighting and neutral materials.',
    category: 'scene',
  },
  {
    id: '3',
    name: 'Lighting Setup',
    icon: 'lightbulb',
    prompt: 'Set up a professional three-point studio lighting for the current scene with a key light, fill light, and rim light. Use area lights.',
    category: 'lighting',
  },
  {
    id: '4',
    name: 'Product Render',
    icon: 'camera',
    prompt: 'Create a product photography setup: place a glass bottle on a turntable with a curved backdrop, soft area lighting, and camera with shallow depth of field.',
    category: 'rendering',
  },
  {
    id: '5',
    name: 'Material Study',
    icon: 'paintbrush',
    prompt: 'Create a row of 6 spheres, each with a different material: glass, chrome, wood, concrete, fabric, and emissive neon. Arrange them on a shelf.',
    category: 'materials',
  },
  {
    id: '6',
    name: 'Furniture',
    icon: 'armchair',
    prompt: 'Create a realistic Scandinavian-style wooden chair with a cushioned seat. Use proper proportions and wood/padding materials.',
    category: 'modeling',
  },
  {
    id: '7',
    name: 'Nature',
    icon: 'tree',
    prompt: 'Create a low-poly stylized tree with a brown trunk and green foliage canopy. Place it on a small grassy hill with a few rocks.',
    category: 'scene',
  },
  {
    id: '8',
    name: 'Jewelry',
    icon: 'gem',
    prompt: 'Create a diamond ring: a silver band with a faceted diamond on top. Use metallic material for the band and glass/refractive material for the gem.',
    category: 'modeling',
  },
];

const iconMap: Record<string, React.ReactNode> = {
  box: <Box size={16} />,
  home: <Home size={16} />,
  lightbulb: <Lightbulb size={16} />,
  camera: <Camera size={16} />,
  paintbrush: <Paintbrush size={16} />,
  armchair: <Armchair size={16} />,
  tree: <TreePine size={16} />,
  gem: <Gem size={16} />,
};

interface PromptChipsProps {
  onSelect: (prompt: string) => void;
}

export default function PromptChips({ onSelect }: PromptChipsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl mx-auto">
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset.prompt)}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border-custom bg-bg-secondary hover:bg-bg-tertiary hover:border-accent text-left transition-all duration-200 group"
        >
          <span className="text-accent group-hover:text-accent-hover transition-colors shrink-0">
            {iconMap[preset.icon] || <Box size={16} />}
          </span>
          <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors leading-tight">
            {preset.name}
          </span>
        </button>
      ))}
    </div>
  );
}
