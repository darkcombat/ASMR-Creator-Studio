import React from 'react';

interface PlanDisplayProps {
  content: string;
}

export const PlanDisplay: React.FC<PlanDisplayProps> = ({ content }) => {
  // Simple markdown-like rendering for the specific format requested
  // We split by newlines and try to identify headers and lists
  
  const lines = content.split('\n');

  return (
    <div className="space-y-4 text-slate-700 leading-relaxed">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        
        // Bold Headers (Lines starting with emojis or hashtags)
        if (trimmed.startsWith('🎬') || trimmed.startsWith('⏱️') || trimmed.startsWith('📋') || trimmed.startsWith('🎙️') || trimmed.startsWith('📝') || trimmed.startsWith('🔍') || trimmed.startsWith('##')) {
          return (
            <h3 key={index} className="text-xl font-bold text-lavender-900 mt-6 mb-2 border-b border-lavender-200 pb-1">
              {line.replace(/#/g, '')}
            </h3>
          );
        }
        
        // Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={index} className="flex items-start ml-4 mb-1">
              <span className="mr-2 text-lavender-500">•</span>
              <span>{line.replace(/^[-*]\s/, '')}</span>
            </div>
          );
        }

        // Numbered lists
        if (/^\d+\./.test(trimmed)) {
             return (
            <div key={index} className="flex items-start ml-4 mb-1 font-medium text-slate-800">
              <span className="mr-2 text-lavender-600">{trimmed.split('.')[0]}.</span>
              <span>{trimmed.replace(/^\d+\.\s/, '')}</span>
            </div>
          );
        }

        // Bold text inside line (simple parser)
        const parts = line.split('**');
        if (parts.length > 1) {
             return (
                <p key={index} className="min-h-[1rem]">
                    {parts.map((part, i) => 
                        i % 2 === 1 ? <strong key={i} className="text-lavender-800">{part}</strong> : part
                    )}
                </p>
             )
        }

        // Empty lines
        if (trimmed === '') {
          return <div key={index} className="h-2"></div>;
        }

        return <p key={index} className="">{line}</p>;
      })}
    </div>
  );
};