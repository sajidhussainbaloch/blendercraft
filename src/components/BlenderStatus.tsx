interface BlenderStatusProps {
  connected: boolean;
  providerName: string;
}

export default function BlenderStatus({ connected, providerName }: BlenderStatusProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-sm">
        <span
          className={`w-2 h-2 rounded-full ${
            connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}
        />
        <span className="text-gray-400">
          {connected ? 'Blender Connected' : 'Blender Disconnected'}
        </span>
      </div>
      <div className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
        {providerName}
      </div>
    </div>
  );
}
