import React from 'react';
import { X, Star } from 'lucide-react';
import { DevTool } from '../types';
import { JsonBeautifierTool } from './tools/JsonBeautifierTool';
import { CodeObfuscatorTool } from './tools/CodeObfuscatorTool';
import { Base64Tool } from './tools/Base64Tool';
import { RegexTesterTool } from './tools/RegexTesterTool';
import { JwtDecoderTool } from './tools/JwtDecoderTool';
import { HashGeneratorTool } from './tools/HashGeneratorTool';
import { ColorConverterTool } from './tools/ColorConverterTool';
import { UuidGeneratorTool } from './tools/UuidGeneratorTool';
import { UrlEncoderTool } from './tools/UrlEncoderTool';
import { CronParserTool } from './tools/CronParserTool';
import { MarkdownPreviewTool } from './tools/MarkdownPreviewTool';
import { CodeFormatterTool } from './tools/CodeFormatterTool';
import { JavaObfuscatorTool } from './tools/JavaObfuscatorTool';
import { PdfSignerTool } from './tools/PdfSignerTool';
import { PdfConverterTool } from './tools/PdfConverterTool';
import { JavaFormatterTool } from './tools/JavaFormatterTool';
import { GenericTool } from './tools/GenericTool';

interface ToolModalProps {
  tool: DevTool | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (toolId: string, e: React.MouseEvent) => void;
}

export const ToolModal: React.FC<ToolModalProps> = ({
  tool,
  onClose,
  isFavorite,
  onToggleFavorite,
}) => {
  if (!tool) return null;

  const renderToolBody = () => {
    switch (tool.id) {
      case 'json-beautifier':
        return <JsonBeautifierTool />;
      case 'code-obfuscator':
        return <CodeObfuscatorTool />;
      case 'java-obfuscator':
        return <JavaObfuscatorTool />;
      case 'base64-encoder':
        return <Base64Tool />;
      case 'regex-tester':
        return <RegexTesterTool />;
      case 'jwt-decoder':
        return <JwtDecoderTool />;
      case 'hash-generator':
        return <HashGeneratorTool />;
      case 'color-converter':
        return <ColorConverterTool />;
      case 'uuid-generator':
        return <UuidGeneratorTool />;
      case 'url-encoder':
        return <UrlEncoderTool />;
      case 'cron-parser':
        return <CronParserTool />;
      case 'markdown-preview':
        return <MarkdownPreviewTool />;
      case 'code-formatter':
        return <CodeFormatterTool />;
      case 'pdf-signer':
        return <PdfSignerTool />;
      case 'pdf-converter':
        return <PdfConverterTool />;
      case 'java-formatter':
        return <JavaFormatterTool />;
      default:
        return <GenericTool tool={tool} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative z-50 w-full max-w-4xl bg-[#1E293B] text-slate-100 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0F172A]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-mono font-bold text-sm text-indigo-400 shadow-2xs">
              {tool.iconText}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white text-lg">{tool.name}</h2>
                <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {tool.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{tool.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => onToggleFavorite(tool.id, e)}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star
                className={`w-5 h-5 ${
                  isFavorite ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                }`}
              />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">{renderToolBody()}</div>
      </div>
    </div>
  );
};
