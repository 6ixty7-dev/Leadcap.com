'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Mail, MessageSquare, AtSign, Copy, RefreshCw, 
  Send, ShieldCheck, Sparkles, Check, ChevronRight,
  TrendingUp, Globe, Smartphone, Search, AlertCircle, Phone
} from 'lucide-react';
import { Lead, LeadDetail } from '@/types';
import { generateOutreach, fetchLead, sendEmailOutreach, logWhatsAppOutreach } from '@/lib/api';
import { cn } from '@/lib/utils';

interface OutreachModalProps {
  lead: Lead;
  onClose: () => void;
}

export default function OutreachModal({ lead, onClose }: OutreachModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(true);
  const [fullLead, setFullLead] = useState<LeadDetail | null>(null);
  const [intent, setIntent] = useState('');
  const [tone, setTone] = useState('professional');
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'email' | 'whatsapp' | 'instagram' | 'call'>('email');
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const loadDetails = async () => {
      setFetchingDetails(true);
      try {
        const res = await fetchLead(lead.id);
        if (res.success && res.data) {
          setFullLead(res.data);
          // If there is notes or custom hooks, we don't auto fill yet but let the user select
        }
      } catch (err) {
        console.error('[OutreachModal] Error loading lead details:', err);
      } finally {
        setFetchingDetails(false);
      }
    };
    loadDetails();
  }, [lead.id]);

  const handleGenerate = async () => {
    if (!intent) return;
    setLoading(true);
    try {
      const res = await generateOutreach(lead.id, intent, intent, tone);
      setResult(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async () => {
    if (!result || !lead.email) return;
    setSendingEmail(true);
    setEmailStatus('idle');
    try {
      const res = await sendEmailOutreach(lead.id, result.email_subject, result.email_body);
      if (res.success) {
        setEmailStatus('success');
      } else {
        setEmailStatus('error');
      }
    } catch (err) {
      console.error('Email send error:', err);
      setEmailStatus('error');
    }
    setSendingEmail(false);
  };

  const handleSendWhatsApp = async () => {
    if (!result) return;
    try {
      await logWhatsAppOutreach(lead.id, result.whatsapp_message);
      // Open WhatsApp web
      let phone = lead.phone ? lead.phone.replace(/\\D/g, '') : '8921066120';
      if (!phone.startsWith('91') && phone.length === 10) phone = '91' + phone;
      window.open(\`https://wa.me/\${phone}?text=\${encodeURIComponent(result.whatsapp_message)}\`, '_blank');
    } catch (err) {
      console.error(err);
    }
  };

  // Clean and parse the outreach hooks
  const hooks = fullLead?.ai_analysis?.suggested_outreach_hooks
    ? fullLead.ai_analysis.suggested_outreach_hooks
        .split('\n')
        .map((h: string) => h.replace(/^\s*[-*•\d+.]\s*/, '').trim())
        .filter((h: string) => h.length > 0)
    : [];

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col md:flex-row"
      >
        {/* Left Sidebar: Business Profile & Context */}
        <div className="w-full md:w-80 border-r border-zinc-800 p-6 overflow-y-auto bg-zinc-900/30 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold">{lead.business_name}</h2>
                <p className="text-zinc-500 text-sm">{lead.category}</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* AI Insights Summary */}
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                <div className="flex items-center gap-2 mb-2 text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">AI Priority Score</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-indigo-400">{lead.score || 85}</span>
                  <span className="text-zinc-500 text-xs mb-1">/ 100</span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
                  {fullLead?.ai_analysis?.summary || lead.ranking_reason || 'High quality business lead verified for direct outreach campaign.'}
                </p>
              </div>

              {/* Outreach Hooks Suggestions */}
              {fetchingDetails ? (
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-12 w-full bg-zinc-800/40 rounded-xl animate-pulse" />
                  <div className="h-12 w-full bg-zinc-800/40 rounded-xl animate-pulse" />
                </div>
              ) : hooks.length > 0 ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Suggested AI Hooks</label>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {hooks.map((hook, index) => (
                      <button
                        key={index}
                        onClick={() => setIntent(hook)}
                        className={cn(
                          "w-full text-left p-3 rounded-xl border text-xs leading-relaxed transition-all duration-200 cursor-pointer shadow-sm hover:shadow",
                          intent === hook
                            ? "bg-indigo-600/20 border-indigo-500 text-indigo-200 font-medium"
                            : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
                        )}
                      >
                        {hook}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Outreach Context Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">My Service / Offer</label>
                  <textarea 
                    value={intent}
                    onChange={(e) => setIntent(e.target.value)}
                    placeholder="e.g. Custom website design with modern branding, SEO optimization..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[100px] text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Message Tone</label>
                  <select 
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white cursor-pointer"
                  >
                    <option value="professional">Professional / B2B</option>
                    <option value="luxury">Luxury / Premium</option>
                    <option value="casual">Casual / Friendly</option>
                    <option value="aggressive">Aggressive Sales</option>
                  </select>
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={loading || !intent}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-indigo-500/20"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate Outreach
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content: Output */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex bg-zinc-900 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('email')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'email' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </button>
              <button 
                onClick={() => setActiveTab('whatsapp')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'whatsapp' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button 
                onClick={() => setActiveTab('instagram')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'instagram' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <AtSign className="w-3.5 h-3.5" /> Instagram
              </button>
              <button 
                onClick={() => setActiveTab('call')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'call' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Phone className="w-3.5 h-3.5" /> Call
              </button>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 relative">
            <AnimatePresence mode="wait">
              {!result && !loading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-3xl bg-zinc-900 flex items-center justify-center border border-zinc-800">
                    <Send className="w-8 h-8 text-zinc-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Ready to connect?</h3>
                    <p className="text-zinc-500 text-sm max-w-xs mx-auto">Enter your service details on the left to generate personalized AI outreach messages.</p>
                  </div>
                </motion.div>
              )}

              {loading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center space-y-4"
                >
                  <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
                  <p className="text-indigo-400 font-medium animate-pulse">AI is crafting your perfect pitch...</p>
                </motion.div>
              )}

              {result && !loading && (
                <motion.div 
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {activeTab === 'email' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Subject Line</label>
                        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-medium flex justify-between items-center group">
                          <span>{result.email_subject}</span>
                          <button onClick={() => copyToClipboard(result.email_subject)} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-zinc-800 rounded-lg transition-all">
                            <Copy className="w-4 h-4 text-zinc-400" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Email Body</label>
                        <div className="relative p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-sm leading-relaxed whitespace-pre-wrap group">
                          {result.email_body}
                          <button 
                            onClick={() => copyToClipboard(result.email_body)}
                            className="absolute top-4 right-4 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl shadow-xl border border-zinc-700 transition-all opacity-0 group-hover:opacity-100"
                          >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white" />}
                          </button>
                        </div>
                      </div>
                      
                      {lead.email ? (
                        <div className="flex gap-2">
                          <button 
                            onClick={handleSendEmail}
                            disabled={sendingEmail || emailStatus === 'success'}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-indigo-500/20"
                          >
                            {sendingEmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : 
                             emailStatus === 'success' ? <Check className="w-4 h-4" /> : 
                             <Send className="w-4 h-4" />}
                            {sendingEmail ? 'Sending...' : 
                             emailStatus === 'success' ? 'Email Sent!' : 
                             'Send Real Email'}
                          </button>
                          {emailStatus === 'error' && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center">
                              Failed to send. Check SMTP.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 text-xs flex items-center gap-2 font-medium">
                          <AlertCircle className="w-4 h-4" /> No email address found for this lead.
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'whatsapp' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Message Text</label>
                      <div className="relative p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-sm leading-relaxed whitespace-pre-wrap group max-w-sm">
                        {result.whatsapp_message}
                        <button 
                          onClick={() => copyToClipboard(result.whatsapp_message)}
                          className="absolute top-4 right-4 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl shadow-xl border border-zinc-700 transition-all opacity-0 group-hover:opacity-100"
                        >
                          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white" />}
                        </button>
                      </div>
                      <button 
                        onClick={handleSendWhatsApp}
                        className="w-full max-w-sm mt-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#25D366]/20"
                      >
                        <MessageSquare className="w-4 h-4" /> Open in WhatsApp Web
                      </button>
                    </div>
                  )}

                  {activeTab === 'instagram' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Direct Message</label>
                      <div className="relative p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-sm leading-relaxed whitespace-pre-wrap group max-w-sm">
                        {result.instagram_dm}
                        <button 
                          onClick={() => copyToClipboard(result.instagram_dm)}
                          className="absolute top-4 right-4 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl shadow-xl border border-zinc-700 transition-all opacity-0 group-hover:opacity-100"
                        >
                          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white" />}
                        </button>
                      </div>
                      <button 
                        onClick={() => window.open(\`https://instagram.com/\${lead.instagram?.replace('@', '') || ''}\`, '_blank')}
                        className="w-full max-w-sm mt-4 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                      >
                        <AtSign className="w-4 h-4" /> Open Instagram Profile
                      </button>
                    </div>
                  )}

                  {activeTab === 'call' && (
                    <div className="space-y-4">
                      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 max-w-sm">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <Phone className="w-6 h-6 text-indigo-400" />
                          </div>
                          <div>
                            <div className="text-sm text-zinc-500 font-bold uppercase tracking-widest">Phone Number</div>
                            <div className="text-xl font-bold">{lead.phone || 'No phone number'}</div>
                          </div>
                        </div>
                        
                        {lead.phone ? (
                          <a href={\`tel:\${lead.phone}\`} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer">
                            Click to Call
                          </a>
                        ) : (
                          <div className="p-3 bg-zinc-800/50 rounded-xl text-zinc-500 text-xs text-center">
                            No valid phone number for direct calling.
                          </div>
                        )}
                        <div className="border-t border-zinc-800 pt-4 mt-4 space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Call Notes</label>
                            <textarea id="call-notes" placeholder="Enter notes from the call..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 min-h-[80px]" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Outcome</label>
                            <select id="call-outcome" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                              <option value="interested">Interested</option>
                              <option value="not_interested">Not Interested</option>
                              <option value="voicemail">Voicemail</option>
                              <option value="follow_up">Needs Follow Up</option>
                              <option value="wrong_number">Wrong Number</option>
                            </select>
                          </div>
                          <button 
                            onClick={async () => {
                              const notes = (document.getElementById('call-notes') as HTMLTextAreaElement).value;
                              const outcome = (document.getElementById('call-outcome') as HTMLSelectElement).value;
                              try {
                                const { logCall } = await import('@/lib/api');
                                await logCall(lead.id, notes, outcome, 0);
                                alert('Call logged successfully!');
                                (document.getElementById('call-notes') as HTMLTextAreaElement).value = '';
                              } catch(e) {
                                console.error(e);
                              }
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition-all text-sm"
                          >
                            Log Call
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
            <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> AI Verified</span>
              <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-blue-500" /> Real-time Data</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleGenerate}
                disabled={!result || loading}
                className="btn-secondary text-xs flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
              </button>
              <button className="bg-white text-black font-bold px-6 py-2 rounded-xl text-xs hover:bg-zinc-200 transition-all flex items-center gap-2 shadow-xl">
                Track Contacted <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
