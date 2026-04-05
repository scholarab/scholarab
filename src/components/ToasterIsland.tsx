import { Toaster } from 'sonner';

export default function ToasterIsland() {
  return (
    <Toaster
      position="bottom-center"
      offset={90}
      toastOptions={{
        style: {
          background: '#22d3a5',
          color: '#0a0a0f',
          fontSize: '13px',
          fontWeight: '600',
          borderRadius: '999px',
          padding: '10px 22px',
          border: 'none',
          boxShadow: '0 4px 20px rgba(34,211,165,0.35)',
          whiteSpace: 'nowrap',
        },
      }}
    />
  );
}
