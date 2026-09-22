import React, { useState, useEffect } from 'react';
import { X, Star, Maximize2, Minimize2 } from 'lucide-react';
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
import { DualJavaObfuscatorTool } from './tools/DualJavaObfuscatorTool';
import { MultiObfuscatorTool } from './tools/MultiObfuscatorTool';
import { PdfSignerTool } from './tools/PdfSignerTool';
import { PdfConverterTool } from './tools/PdfConverterTool';
import { JavaFormatterTool } from './tools/JavaFormatterTool';
import { CurlConverterTool } from './tools/CurlConverterTool';
import { CurlFlattenerTool } from './tools/CurlFlattenerTool';
import { InvoiceGeneratorTool } from './tools/InvoiceGeneratorTool';
import { PdfToMarkdownTool } from './tools/PdfToMarkdownTool';
import { AgreementGeneratorTool } from './tools/AgreementGeneratorTool';
import { QrCodeGeneratorTool } from './tools/QrCodeGeneratorTool';
import { CurlChainConverterTool } from './tools/CurlChainConverterTool';
import { CurlDbChainConverterTool } from './tools/CurlDbChainConverterTool';
import { DbUpdateQueryGeneratorTool } from './tools/DbUpdateQueryGeneratorTool';
import { DbSelectQueryGeneratorTool } from './tools/DbSelectQueryGeneratorTool';
import { DbCategoryMatcherTool } from './tools/DbCategoryMatcherTool';
import { DbQueryBuilderTool } from './tools/DbQueryBuilderTool';
import { DataGridConverterTool } from './tools/DataGridConverterTool';
import { DataSetMatcherTool } from './tools/DataSetMatcherTool';
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
  const [isFullScreen, setIsFullScreen] = useState<boolean>(() => {
    if (!tool) return false;
    if (tool.id === 'java-dual-obfuscator') {
      try {
        const saved = localStorage.getItem('devhub_fullscreen_java_dual');
        return saved !== null ? saved === 'true' : true;
      } catch (e) {
        return true;
      }
    }
    if (tool.id === 'java-obfuscator') {
      try {
        const saved = localStorage.getItem('devhub_fullscreen_java_single');
        return saved !== null ? saved === 'true' : false;
      } catch (e) {
        return false;
      }
    }
    if (tool.id === 'db-update-query-generator') {
      try {
        const saved = localStorage.getItem('devhub_fullscreen_db_update');
        return saved !== null ? saved === 'true' : false;
      } catch (e) {
        return false;
      }
    }
    if (tool.id === 'data-grid-converter') {
      try {
        const saved = localStorage.getItem('devhub_fullscreen_data_grid');
        return saved !== null ? saved === 'true' : false;
      } catch (e) {
        return false;
      }
    }
    if (tool.id === 'db-category-matcher') {
      try {
        const saved = localStorage.getItem('devhub_fullscreen_db_category_matcher');
        return saved !== null ? saved === 'true' : false;
      } catch (e) {
        return false;
      }
    }
    if (tool.id === 'db-query-builder') {
      try {
        const saved = localStorage.getItem('devhub_fullscreen_db_query_builder');
        return saved !== null ? saved === 'true' : false;
      } catch (e) {
        return false;
      }
    }
    if (tool.id === 'data-set-matcher') {
      try {
        const saved = localStorage.getItem('devhub_fullscreen_data_set_matcher');
        return saved !== null ? saved === 'true' : false;
      } catch (e) {
        return false;
      }
    }
    return false;
  });

  useEffect(() => {
    if (tool?.id === 'java-dual-obfuscator') {
      try {
        const saved = localStorage.getItem('devhub_fullscreen_java_dual');
        setIsFullScreen(saved !== null ? saved === 'true' : true);
      } catch (e) {
        setIsFullScreen(true);
      }
    } else if (tool?.id === 'java-obfuscator') {
      try {
        const saved = localStorage.getItem('devhub_fullscreen_java_single');
        setIsFullScreen(saved !== null ? saved === 'true' : false);
      } catch (e) {
        setIsFullScreen(false);
      }
    } else if (tool?.id === 'db-update-query-generator') {
      try {
        const saved = localStorage.getItem('devhub_fullscreen_db_update');
        setIsFullScreen(saved !== null ? saved === 'true' : false);
      } catch (e) {
        setIsFullScreen(false);
      }
    } else if (tool?.id === 'db-select-query-generator') {
      try {
        const saved = localStorage.getItem('devhub_fullscreen_db_select');
        setIsFullScreen(saved !== null ? saved === 'true' : false);
      } catch (e) {
        setIsFullScreen(false);
      }
    } else if (tool?.id === 'db-category-matcher') {
      try {
        const saved = localStorage.getItem('devhub_fullscreen_db_category_matcher');
        setIsFullScreen(saved !== null ? saved === 'true' : false);
      } catch (e) {
        setIsFullScreen(false);
      }
    } else if (tool?.id === 'db-query-builder') {
      try {
        const saved = localStorage.getItem('devhub_fullscreen_db_query_builder');
        setIsFullScreen(saved !== null ? saved === 'true' : false);
      } catch (e) {
        setIsFullScreen(false);
      }
    } else if (tool?.id === 'data-grid-converter') {
      try {
        const saved = localStorage.getItem('devhub_fullscreen_data_grid');
        setIsFullScreen(saved !== null ? saved === 'true' : false);
      } catch (e) {
        setIsFullScreen(false);
      }
    } else if (tool?.id === 'data-set-matcher') {
      try {
        const saved = localStorage.getItem('devhub_fullscreen_data_set_matcher');
        setIsFullScreen(saved !== null ? saved === 'true' : false);
      } catch (e) {
        setIsFullScreen(false);
      }
    } else {
      setIsFullScreen(false);
    }
  }, [tool?.id]);

  const handleToggleFullScreen = () => {
    setIsFullScreen((prev) => {
      const next = !prev;
      if (tool?.id === 'java-dual-obfuscator') {
        try {
          localStorage.setItem('devhub_fullscreen_java_dual', String(next));
        } catch (e) {
          // ignore
        }
      } else if (tool?.id === 'java-obfuscator') {
        try {
          localStorage.setItem('devhub_fullscreen_java_single', String(next));
        } catch (e) {
          // ignore
        }
      } else if (tool?.id === 'db-update-query-generator') {
        try {
          localStorage.setItem('devhub_fullscreen_db_update', String(next));
        } catch (e) {
          // ignore
        }
      } else if (tool?.id === 'db-select-query-generator') {
        try {
          localStorage.setItem('devhub_fullscreen_db_select', String(next));
        } catch (e) {
          // ignore
        }
      } else if (tool?.id === 'db-category-matcher') {
        try {
          localStorage.setItem('devhub_fullscreen_db_category_matcher', String(next));
        } catch (e) {
          // ignore
        }
      } else if (tool?.id === 'db-query-builder') {
        try {
          localStorage.setItem('devhub_fullscreen_db_query_builder', String(next));
        } catch (e) {
          // ignore
        }
      } else if (tool?.id === 'data-grid-converter') {
        try {
          localStorage.setItem('devhub_fullscreen_data_grid', String(next));
        } catch (e) {
          // ignore
        }
      } else if (tool?.id === 'data-set-matcher') {
        try {
          localStorage.setItem('devhub_fullscreen_data_set_matcher', String(next));
        } catch (e) {
          // ignore
        }
      }
      return next;
    });
  };

  if (!tool) return null;

  const renderToolBody = () => {
    switch (tool.id) {
      case 'json-beautifier':
        return <JsonBeautifierTool />;
      case 'code-obfuscator':
        return <CodeObfuscatorTool />;
      case 'java-obfuscator':
        return (
          <JavaObfuscatorTool
            isFullScreen={isFullScreen}
            onToggleFullScreen={handleToggleFullScreen}
          />
        );
      case 'java-dual-obfuscator':
        return (
          <DualJavaObfuscatorTool
            isFullScreen={isFullScreen}
            onToggleFullScreen={handleToggleFullScreen}
          />
        );
      case 'multi-obfuscator':
        return <MultiObfuscatorTool />;
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
      case 'curl-converter':
        return <CurlConverterTool />;
      case 'curl-flattener':
        return <CurlFlattenerTool />;
      case 'invoice-generator':
        return <InvoiceGeneratorTool />;
      case 'pdf-to-markdown':
        return <PdfToMarkdownTool />;
      case 'agreement-generator':
        return <AgreementGeneratorTool />;
      case 'qr-generator':
        return <QrCodeGeneratorTool />;
      case 'curl-chain-to-python':
        return <CurlChainConverterTool />;
      case 'curl-db-chain-to-python':
        return <CurlDbChainConverterTool />;
      case 'db-update-query-generator':
        return (
          <DbUpdateQueryGeneratorTool
            isFullScreen={isFullScreen}
            onToggleFullScreen={handleToggleFullScreen}
          />
        );
      case 'db-select-query-generator':
        return (
          <DbSelectQueryGeneratorTool
            isFullScreen={isFullScreen}
            onToggleFullScreen={handleToggleFullScreen}
          />
        );
      case 'db-category-matcher':
        return (
          <DbCategoryMatcherTool
            isFullScreen={isFullScreen}
            onToggleFullScreen={handleToggleFullScreen}
          />
        );
      case 'db-query-builder':
        return (
          <DbQueryBuilderTool
            isFullScreen={isFullScreen}
            onToggleFullScreen={handleToggleFullScreen}
          />
        );
      case 'data-grid-converter':
        return (
          <DataGridConverterTool
            isFullScreen={isFullScreen}
            onToggleFullScreen={handleToggleFullScreen}
          />
        );
      case 'data-set-matcher':
        return (
          <DataSetMatcherTool
            isFullScreen={isFullScreen}
            onToggleFullScreen={handleToggleFullScreen}
          />
        );
      default:
        return <GenericTool tool={tool} />;
    }
  };

  const isWideModal = [
    'java-dual-obfuscator',
    'java-obfuscator',
    'pdf-signer',
    'pdf-converter',
    'pdf-to-markdown',
    'invoice-generator',
    'agreement-generator',
    'curl-converter',
    'curl-chain-to-python',
    'curl-db-chain-to-python',
    'db-update-query-generator',
    'db-select-query-generator',
    'db-category-matcher',
    'db-query-builder',
    'data-grid-converter',
    'data-set-matcher',
    'java-formatter',
    'multi-obfuscator',
    'qr-generator'
  ].includes(tool.id);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isFullScreen ? 'p-0' : 'p-3 sm:p-6'}`}>
      {/* Backdrop (hidden in full viewport) */}
      {!isFullScreen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Modal Dialog */}
      <div
        className={`relative z-50 w-full ${
          isFullScreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none border-0 shadow-none'
            : `${isWideModal ? 'max-w-7xl' : 'max-w-4xl'} rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh]`
        } bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 overflow-hidden flex flex-col`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 shadow-2xs">
              {tool.iconText}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 dark:text-white text-lg">{tool.name}</h2>
                <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20">
                  {tool.category}
                </span>
                {isFullScreen && (
                  <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Full Viewport
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tool.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Toggle Full Viewport Button */}
            <button
              onClick={handleToggleFullScreen}
              className={`p-2 rounded-lg transition-colors ${
                isFullScreen
                  ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/25 border border-indigo-500/30'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
              }`}
              title={isFullScreen ? 'Exit full viewport (Restore modal window)' : 'Use full viewport'}
              aria-label={isFullScreen ? 'Exit full viewport' : 'Use full viewport'}
            >
              {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            <button
              onClick={(e) => onToggleFavorite(tool.id, e)}
              className="p-2 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star
                className={`w-5 h-5 ${
                  isFavorite ? 'text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400' : 'text-slate-300 dark:text-slate-600'
                }`}
              />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className={`overflow-y-auto flex-1 ${isFullScreen ? 'p-4 sm:p-6 h-[calc(100vh-68px)]' : 'p-6'}`}>
          {renderToolBody()}
        </div>
      </div>
    </div>
  );
};
