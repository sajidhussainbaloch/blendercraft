import type { PromptPreset } from '../lib/types';
import { Box, Lightbulb, Camera, Paintbrush, Armchair, TreePine, Home, Gem } from 'lucide-react';

const presets: PromptPreset[] = [
  { id: '1', name: 'Treasure Chest', icon: 'box', prompt: 'Create a detailed medieval treasure chest with metal bands, a lock, and wooden planks. Use proper materials for wood and metal.', category: 'modeling' },
  { id: '2', name: 'Living Room', icon: 'home', prompt: 'Create a modern minimalist living room with a sofa, coffee table, rug, floor lamp, and a large window. Use warm lighting and neutral materials.', category: 'scene' },
  { id: '3', name: 'Studio Lighting', icon: 'lightbulb', prompt: 'Set up a professional three-point studio lighting for the current scene with a key light, fill light, and rim light. Use area lights.', category: 'lighting' },
  { id: '4', name: 'Product Shot', icon: 'camera', prompt: 'Create a product photography setup: place a glass bottle on a turntable with a curved backdrop, soft area lighting, and camera with shallow depth of field.', category: 'rendering' },
  { id: '5', name: 'Material Study', icon: 'paintbrush', prompt: 'Create a row of 6 spheres, each with a different material: glass, chrome, wood, concrete, fabric, and emissive neon. Arrange them on a shelf.', category: 'materials' },
  { id: '6', name: 'Scandinavian Chair', icon: 'armchair', prompt: 'Create a realistic Scandinavian-style wooden chair with a cushioned seat. Use proper proportions and wood/padding materials.', category: 'modeling' },
  { id: '7', name: 'Stylized Tree', icon: 'tree', prompt: 'Create a low-poly stylized tree with a brown trunk and green foliage canopy. Place it on a small grassy hill with a few rocks.', category: 'scene' },
  { id: '8', name: 'Diamond Ring', icon: 'gem', prompt: 'Create a diamond ring: a silver band with a faceted diamond on top. Use metallic material for the band and glass/refractive material for the gem.', category: 'modeling' },
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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-xl mx-auto">
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset.prompt)}
          className="bg-bg-secondary border border-border-custom rounded-lg p-3 text-left hover:bg-bg-tertiary hover:border-border-hover no-shift group"
        >
          <div className="w-8 h-8 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center mb-2 group-hover:bg-accent/15 group-hover:border-accent/30 no-shift">
            <span className="text-accent">
              {iconMap[preset.icon] || <Box size={16} />}
            </span>
          </div>
          <span className="text-xs text-text-secondary group-hover:text-text-primary no-shift leading-tight block">
            {preset.name}
          </span>
        </button>
      ))}
    </div>
  );
}
