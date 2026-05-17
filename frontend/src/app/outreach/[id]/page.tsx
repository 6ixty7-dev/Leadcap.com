'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchCampaign, fetchCampaignLeads, fetchLeads, addLeadsToCampaign, generateOutreach, updateCampaignLead, sendEmailOutreach } from '@/lib/api';
import { Megaphone, Plus, Search, ChevronRight, Activity, Zap, CheckCircle, Mail, MessageSquare, Copy, RefreshCw, Send, Check } from 'lucide-react';
import { Lead } from '@/types';
import Link from 'next/link';

export default function CampaignDetailsPage() {
  const params = useParams();
  const campaignId = parseInt(params.id as string);

  const [campaign, setCampaign] = useState<any>(null);
  const [campaignLeads, setCampaignLeads] = useState<any[]>([]);
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leads' | 'add'>('leads');
  
  // Generating state
  const [generatingFor, setGeneratingFor] = useState<number | null>(null);
  const [sendingFor, setSendingFor] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [campRes, leadsRes] = await Promise.all([
        fetchCampaign(campaignId),
        fetchCampaignLeads(campaignId)
      ]);
      if (campRes.data) setCampaign(campRes.data);
      if (leadsRes.data) setCampaignLeads(leadsRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadAvailableLeads = async () => {
    try {
      const res = await fetchLeads({ limit: 50, sort_by: 'score', sort_order: 'desc' });
      // Filter out leads already in campaign
      if (res.data) {
        const existingIds = new Set(campaignLeads.map(l => l.lead_id));
        setAvailableLeads(res.data.filter(l => !existingIds.has(l.id)));
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    loadData();
  }, [campaignId]);

  useEffect(() => {
    if (activeTab === 'add') {
      loadAvailableLeads();
    }
  }, [activeTab, campaignLeads]);

  const handleAddLead = async (leadId: number) => {
    try {
      await addLeadsToCampaign(campaignId, [leadId]);
      await loadData();
      setActiveTab('leads');
    } catch (e) { console.error(e); }
  };

  const handleGenerateDraft = async (leadId: number) => {
    setGeneratingFor(leadId);
    try {
      const res = await generateOutreach(leadId, '', '', 'professional', campaignId);
      if (res.success && res.data) {
        await updateCampaignLead(campaignId, leadId, {
          status: 'drafted',
          draft_email_subject: res.data.email_subject,
          draft_email_body: res.data.email_body,
          draft_whatsapp: res.data.whatsapp_message
        });
        loadData();
      }
    } catch (e) { console.error(e); }
    setGeneratingFor(null);
  };

  const handleSendEmail = async (lead: any) => {
    if (!lead.draft_email_subject || !lead.draft_email_body || !lead.email) return;
    setSendingFor(lead.lead_id);
    try {
      const res = await sendEmailOutreach(lead.lead_id, lead.draft_email_subject, lead.draft_email_body, campaignId);
      if (res.success) {
        await updateCampaignLead(campaignId, lead.lead_id, { status: 'sent' });
        loadData();
      }
    } catch (e) { console.error(e); }
    setSendingFor(null);
  };

  if (loading && !campaign) {
    return <div className="p-20 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>;
  }

  if (!campaign) {
    return <div className="p-20 text-center text-zinc-500">Campaign not found.</div>;
  }

  const draftedCount = campaignLeads.filter(l => l.status === 'drafted').length;
  const sentCount = campaignLeads.filter(l => l.status === 'sent').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-[1600px] mx-auto pb-20">
      
      {/* Header Info */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 bg-indigo-500/5 blur-3xl rounded-full" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="max-w-2xl">
            <Link href="/outreach" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest mb-4 inline-block flex items-center gap-1">
              <ChevronRight className="w-3 h-3 rotate-180" /> Back to Campaigns
            </Link>
            <h1 className="text-3xl font-black text-white tracking-tighter mb-2">{campaign.name}</h1>
            <p className="text-sm text-zinc-400 leading-relaxed bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 mb-4">
              <strong>Objective:</strong> {campaign.objective || 'N/A'}<br/>
              <strong>Offer:</strong> {campaign.offer || 'N/A'}<br/>
              <strong>CTA:</strong> {campaign.cta || 'N/A'}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="text-center px-4 border-r border-zinc-800">
              <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest mb-1">Leads</p>
              <p className="text-xl font-black text-white">{campaignLeads.length}</p>
            </div>
            <div className="text-center px-4 border-r border-zinc-800">
              <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest mb-1">Drafts</p>
              <p className="text-xl font-black text-indigo-400">{draftedCount}</p>
            </div>
            <div className="text-center px-4">
              <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest mb-1">Sent</p>
              <p className="text-xl font-black text-emerald-400">{sentCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button 
          onClick={() => setActiveTab('leads')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'leads' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:bg-zinc-900'}`}
        >
          Pipeline ({campaignLeads.length})
        </button>
        <button 
          onClick={() => setActiveTab('add')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'add' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:bg-zinc-900'}`}
        >
          <Plus className="w-4 h-4" /> Add Leads
        </button>
      </div>

      {/* Content */}
      {activeTab === 'add' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableLeads.map(lead => (
            <div key={lead.id} className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between h-full">
              <div>
                <h3 className="text-white font-bold">{lead.business_name}</h3>
                <div className="text-xs text-zinc-500 mt-1">{lead.city} • {lead.category}</div>
                <div className="text-xs font-bold text-indigo-400 mt-2 bg-indigo-500/10 inline-block px-2 py-1 rounded">Score: {lead.score}</div>
              </div>
              <button 
                onClick={() => handleAddLead(lead.id)}
                className="mt-4 w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-xs font-bold py-2 rounded-xl transition-all"
              >
                Add to Campaign
              </button>
            </div>
          ))}
          {availableLeads.length === 0 && (
            <div className="col-span-full py-12 text-center text-zinc-500">No new high-score leads available to add.</div>
          )}
        </div>
      )}

      {activeTab === 'leads' && (
        <div className="space-y-6">
          {campaignLeads.map(lead => (
            <div key={lead.lead_id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row gap-6">
              
              {/* Lead Info */}
              <div className="w-full lg:w-1/4 border-b lg:border-b-0 lg:border-r border-zinc-800 pb-4 lg:pb-0 lg:pr-6">
                <h3 className="font-bold text-lg text-white">{lead.business_name}</h3>
                <p className="text-xs text-zinc-500 mt-1">{lead.category}</p>
                
                <div className="mt-4 space-y-2">
                  <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                    lead.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400' :
                    lead.status === 'drafted' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {lead.status}
                  </span>
                  
                  {lead.email && <div className="text-xs text-zinc-400 flex items-center gap-2"><Mail className="w-3 h-3" /> {lead.email}</div>}
                  {lead.phone && <div className="text-xs text-zinc-400 flex items-center gap-2"><MessageSquare className="w-3 h-3" /> {lead.phone}</div>}
                </div>

                <div className="mt-6">
                  <button 
                    onClick={() => handleGenerateDraft(lead.lead_id)}
                    disabled={generatingFor === lead.lead_id}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {generatingFor === lead.lead_id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-indigo-400" />}
                    {lead.status === 'pending' ? 'Generate AI Draft' : 'Regenerate Draft'}
                  </button>
                </div>
              </div>

              {/* Draft Content */}
              <div className="w-full lg:w-3/4">
                {lead.status === 'pending' ? (
                  <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                    No draft generated yet. Click "Generate AI Draft" to personalize using master prompt.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Email Preview */}
                    <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Mail className="w-3.5 h-3.5"/> Email Draft</span>
                      </div>
                      <div className="text-sm font-bold text-white mb-2 pb-2 border-b border-zinc-800">Subject: {lead.draft_email_subject}</div>
                      <div className="text-sm text-zinc-300 whitespace-pre-wrap">{lead.draft_email_body}</div>
                    </div>

                    {/* WhatsApp Preview */}
                    {lead.draft_whatsapp && (
                      <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5"/> WhatsApp Draft</span>
                        </div>
                        <div className="text-sm text-zinc-300 whitespace-pre-wrap">{lead.draft_whatsapp}</div>
                      </div>
                    )}

                    <div className="flex flex-wrap justify-end gap-3 mt-4">
                      {lead.status !== 'sent' && lead.draft_whatsapp && lead.phone && (
                        <button 
                          onClick={async () => {
                            let phone = lead.phone ? lead.phone.replace(/\D/g, '') : '';
                            if (phone && !phone.startsWith('91') && phone.length === 10) phone = '91' + phone;
                            if (!phone) phone = '8921066120';
                            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lead.draft_whatsapp)}`, '_blank');
                            await updateCampaignLead(campaignId, lead.lead_id, { status: 'sent' });
                            loadData();
                          }}
                          className="bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg"
                        >
                          <MessageSquare className="w-4 h-4" /> Send on WhatsApp
                        </button>
                      )}
                      {lead.status !== 'sent' && lead.email && (
                        <button 
                          onClick={() => handleSendEmail(lead)}
                          disabled={sendingFor === lead.lead_id}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg"
                        >
                          {sendingFor === lead.lead_id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Approve & Send Email
                        </button>
                      )}
                      {lead.status === 'sent' && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold px-6 py-2.5 rounded-xl flex items-center gap-2">
                          <Check className="w-4 h-4" /> Sent
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {campaignLeads.length === 0 && (
            <div className="py-20 text-center bg-zinc-950 border border-zinc-800 rounded-3xl">
              <Megaphone className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
              <p className="text-zinc-500">No leads added to this campaign yet.</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
