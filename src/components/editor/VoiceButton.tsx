import { Mic, MicOff } from 'lucide-react';
import { useVoice } from '@/hooks/useVoice';
import { cn } from '@/lib/utils';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
}

export function VoiceButton({ onTranscript }: VoiceButtonProps) {
  const { isListening, isSupported, transcript, toggleListening } = useVoice(onTranscript);

  if (!isSupported) return null;

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-2">
      {isListening && transcript && (
        <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-3 shadow-lg max-w-xs animate-fade-in">
          <p className="text-sm text-surface-600 dark:text-surface-300 italic">{transcript}</p>
        </div>
      )}
      <button
        onClick={toggleListening}
        className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all',
          isListening
            ? 'bg-accent-rose text-white animate-pulse scale-110'
            : 'bg-primary-500 text-white hover:bg-primary-600 hover:scale-105'
        )}
        title={isListening ? 'Stop dictation' : 'Start voice dictation'}
      >
        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
      </button>
    </div>
  );
}
