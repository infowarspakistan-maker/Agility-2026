import { useState } from 'react';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import Markdown from 'react-markdown';
import { useToast } from './layout/ToastContext';

export default function SEOContentGenerator() {
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('Service');
  const [wordCount, setWordCount] = useState(1500);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const toast = useToast();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/seo-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, type, wordCount })
      });

      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        toast.success("SEO content generated successfully!");
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate content.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-10">
      <div className="bg-slate-950 text-white rounded-[3rem] p-10 relative overflow-hidden group shadow-2xl">
        <div className="absolute -inset-10 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 blur-3xl opacity-50 group-hover:opacity-75 transition-all duration-1000" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-black mb-4 tracking-tight flex items-center gap-3">
              <Sparkles className="text-emerald-400" size={32} />
              SEO AI Content Generator
            </h2>
            <p className="text-slate-400 font-medium leading-relaxed">
              Generate semantically optimized content, metadata, and topical outlines. 
              Powered by advanced AI models tailored for high-ranking service, category, and product pages.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <form onSubmit={handleGenerate} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Main Topic / Primary Keyword</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Rent A Car in Dubai"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-all font-medium text-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Page Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-all font-medium text-slate-700"
                >
                  <option value="Service">Service Page (1,500+ words)</option>
                  <option value="Category">Category Page (1,000 - 1,500 words)</option>
                  <option value="Product">Product Page (500 - 1,000 words)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Target Word Count</label>
                <input
                  type="number"
                  value={wordCount}
                  onChange={(e) => setWordCount(parseInt(e.target.value))}
                  min={100}
                  step={100}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-all font-medium text-slate-700"
                />
              </div>

              <button
                type="submit"
                disabled={isGenerating || !topic}
                className="w-full bg-slate-900 text-white rounded-xl py-4 font-bold tracking-wide hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating Content...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate SEO Content
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative group">
                  <button 
                    onClick={() => copyToClipboard(result.titleTag, 'title')}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-emerald-500 bg-slate-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    {copied === 'title' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">Title Tag</h3>
                  <p className="text-slate-800 font-medium">{result.titleTag}</p>
                </div>
                
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative group">
                  <button 
                    onClick={() => copyToClipboard(result.h1Heading, 'h1')}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-emerald-500 bg-slate-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    {copied === 'h1' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">H1 Heading</h3>
                  <p className="text-slate-800 font-medium">{result.h1Heading}</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative group">
                <button 
                  onClick={() => copyToClipboard(result.metaDescription, 'meta')}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-emerald-500 bg-slate-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  {copied === 'meta' ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">Meta Description</h3>
                <p className="text-slate-800 font-medium">{result.metaDescription}</p>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative group">
                <button 
                  onClick={() => copyToClipboard(result.content, 'content')}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-emerald-500 bg-slate-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  {copied === 'content' ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4">Semantic Body Content</h3>
                <div className="prose prose-slate max-w-none">
                  <Markdown>{result.content}</Markdown>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <Sparkles size={48} className="text-slate-300 mb-6" />
              <h3 className="text-xl font-bold text-slate-700 mb-2">No Content Generated Yet</h3>
              <p className="text-slate-500 max-w-sm">
                Enter a topic, select your page type, and configure your word count to generate highly-optimized SEO content based on topical mapping.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
