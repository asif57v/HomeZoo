import React, { useState, useEffect, useCallback } from 'react';
import { Star, Search, Plus, X, User, Loader2, MapPin, Building2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '../../../services/adminService';

const PartnerRow = ({ partner, action }) => (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl">
        <div className="w-11 h-11 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
            {partner.profileImage ? (
                <img src={partner.profileImage} alt={partner.name} className="w-full h-full object-cover" />
            ) : (
                <User size={20} className="text-gray-400" />
            )}
        </div>
        <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-gray-900 truncate flex items-center gap-1">
                {partner.name}
                {partner.isTopRated && <Star size={12} className="fill-amber-500 text-amber-500 shrink-0" />}
            </p>
            <p className="text-xs text-gray-500 truncate">{partner.email || partner.phone}</p>
            {partner.address?.city && (
                <p className="text-[11px] text-gray-400 flex items-center gap-1 truncate">
                    <MapPin size={10} /> {partner.address.city}
                </p>
            )}
        </div>
        {action}
    </div>
);

const DEFAULT_SECTION = {
    enabled: true,
    badgeText: 'Verified Excellence',
    title: 'Top Rated HomeZo Partners',
    subtitle: 'Collaborate with our highest-performing locality experts and trusted land advisors with proven track records and verified titles.',
    buttonText: 'View All Partners',
    maxPartners: 6
};

const inputCls = 'w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black text-sm';

const AdminTopRatedPartners = () => {
    const [section, setSection] = useState(DEFAULT_SECTION);
    const [sectionLoading, setSectionLoading] = useState(true);
    const [sectionSaving, setSectionSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await adminService.getPlatformSettings();
                if (res.success && res.settings?.topRatedPartnersSection) {
                    setSection({ ...DEFAULT_SECTION, ...res.settings.topRatedPartnersSection });
                }
            } catch {
                toast.error('Failed to load section settings');
            } finally {
                setSectionLoading(false);
            }
        })();
    }, []);

    const setField = (key, value) => setSection((prev) => ({ ...prev, [key]: value }));

    const saveSection = async () => {
        if (!section.title.trim()) {
            toast.error('Heading cannot be empty');
            return;
        }
        try {
            setSectionSaving(true);
            await adminService.updatePlatformSettings({
                topRatedPartnersSection: { ...section, maxPartners: Number(section.maxPartners) }
            });
            toast.success('Section settings saved');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save section settings');
        } finally {
            setSectionSaving(false);
        }
    };

    const [topRated, setTopRated] = useState([]);
    const [loadingTop, setLoadingTop] = useState(true);

    const [search, setSearch] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [busyId, setBusyId] = useState(null);

    const loadTopRated = useCallback(async () => {
        try {
            setLoadingTop(true);
            const data = await adminService.getPartners({ topRated: 'true', limit: 100, page: 1 });
            if (data.success) setTopRated(data.partners);
        } catch {
            toast.error('Failed to load top rated partners');
        } finally {
            setLoadingTop(false);
        }
    }, []);

    useEffect(() => { loadTopRated(); }, [loadTopRated]);

    // Search approved partners (debounced)
    useEffect(() => {
        const timer = setTimeout(async () => {
            try {
                setSearching(true);
                const data = await adminService.getPartners({
                    search: search.trim(),
                    approvalStatus: 'approved',
                    status: 'active',
                    limit: 20,
                    page: 1
                });
                if (data.success) setResults(data.partners.filter((p) => !p.isTopRated));
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [search, topRated]);

    const toggle = async (partner, value) => {
        try {
            setBusyId(partner._id);
            const res = await adminService.updatePartnerTopRated(partner._id, value);
            if (res.success) {
                toast.success(res.message);
                await loadTopRated();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update top rated status');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-16">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Star className="fill-amber-500 text-amber-500" size={22} /> Top Rated Partners
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                    Only the partners added here appear in this section on the user home page.
                    If no partner is added, the section stays hidden.
                </p>
            </div>

            {/* Section text settings */}
            <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm">Section Settings</h3>
                        <p className="text-xs text-gray-500">Edit the text shown above the partner cards on the home page.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-gray-600">{section.enabled ? 'Visible' : 'Hidden'}</span>
                        <button
                            type="button"
                            onClick={() => setField('enabled', !section.enabled)}
                            className={'w-11 h-6 rounded-full p-0.5 transition-colors ' + (section.enabled ? 'bg-black' : 'bg-gray-300')}
                            aria-label="Show section on home page"
                        >
                            <span className={'block w-5 h-5 bg-white rounded-full transition-transform ' + (section.enabled ? 'translate-x-5' : '')} />
                        </button>
                    </div>
                </div>

                {sectionLoading ? (
                    <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={20} /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Small badge text (above heading)</label>
                            <input type="text" maxLength={60} value={section.badgeText} onChange={(e) => setField('badgeText', e.target.value)} placeholder="Leave empty to hide" className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Heading</label>
                            <input type="text" maxLength={120} value={section.title} onChange={(e) => setField('title', e.target.value)} placeholder="Top Rated HomeZo Partners" className={inputCls} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Sub heading</label>
                            <textarea rows={2} maxLength={400} value={section.subtitle} onChange={(e) => setField('subtitle', e.target.value)} placeholder="Leave empty to hide" className={inputCls + ' resize-none'} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Button text</label>
                            <input type="text" maxLength={40} value={section.buttonText} onChange={(e) => setField('buttonText', e.target.value)} placeholder="Leave empty to hide the button" className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Number of partners to show (1 to 10)</label>
                            <input type="number" min="1" max="10" value={section.maxPartners} onChange={(e) => setField('maxPartners', e.target.value)} className={inputCls} />
                        </div>
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={saveSection}
                        disabled={sectionSaving || sectionLoading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-bold rounded-xl shadow-md hover:bg-gray-900 active:scale-95 disabled:opacity-60"
                    >
                        <Save size={16} />
                        {sectionSaving ? 'Saving...' : 'Save Section Settings'}
                    </button>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current list */}
                <section className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-gray-900 text-sm">Currently Top Rated</h3>
                        <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{topRated.length}</span>
                    </div>
                    {loadingTop ? (
                        <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={22} /></div>
                    ) : topRated.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">
                            <Building2 className="mx-auto mb-2 text-gray-300" size={28} />
                            No partners added yet. Use the search on the right to add one.
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {topRated.map((p) => (
                                <PartnerRow
                                    key={p._id}
                                    partner={p}
                                    action={
                                        <button
                                            onClick={() => toggle(p, false)}
                                            disabled={busyId === p._id}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 disabled:opacity-60 shrink-0"
                                        >
                                            <X size={14} /> Remove
                                        </button>
                                    }
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Add partners */}
                <section className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">Add a Partner</h3>
                    <div className="relative mb-3">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search approved partners by name, email or phone"
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>
                    {searching ? (
                        <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={22} /></div>
                    ) : results.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">No approved partners found.</div>
                    ) : (
                        <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                            {results.map((p) => (
                                <PartnerRow
                                    key={p._id}
                                    partner={p}
                                    action={
                                        <button
                                            onClick={() => toggle(p, true)}
                                            disabled={busyId === p._id}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-60 shrink-0"
                                        >
                                            <Plus size={14} /> Add
                                        </button>
                                    }
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default AdminTopRatedPartners;
