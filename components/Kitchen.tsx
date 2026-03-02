
import React, { useState, useEffect } from 'react';
import { ChefHat, Sparkles, RefreshCw, Zap, Trash2, BookOpen, ChevronRight, Save, X, Wand2, Lightbulb, ChefHat as ChefIcon, ArrowLeft, Clock, Heart, Plus, Edit3, ClipboardList } from 'lucide-react';
import { generateRecipe } from '../services/geminiService';
import { db } from '../services/databaseService';
import { Recipe, User } from '../types';

interface KitchenProps {
  user: User | null;
}

const Kitchen: React.FC<KitchenProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'discover' | 'collection'>('discover');
  const [loading, setLoading] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [mealType, setMealType] = useState<'Sehri' | 'Iftar'>('Iftar');
  
  // AI Settings
  const [customInstruction, setCustomInstruction] = useState('');
  const [currentResult, setCurrentResult] = useState<Recipe | null>(null);
  
  // Modals
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Manual Form State
  const [mName, setMName] = useState('');
  const [mIngredients, setMIngredients] = useState('');
  const [mInstructions, setMInstructions] = useState('');

  const QUICK_TAGS = ["Healthy", "Traditional", "Protein Rich", "Quick & Easy", "Kids Choice"];

  useEffect(() => {
    if (!user) return;
    loadCollection();
  }, [user, activeTab]);

  const loadCollection = async () => {
    if (!user) return;
    const items = await db.getRecipes(user.email);
    setSavedRecipes(items);
  };

  const handleSuggest = async (tag?: string, isDraft: boolean = false) => {
    if (!user) return;
    if (isDraft && !customInstruction.trim()) return;
    
    setLoading(true);
    setCurrentResult(null);
    try {
      const preference = tag ? `${tag}. ${customInstruction}` : customInstruction || "balanced and nutritious";
      const data = await generateRecipe(mealType, preference, isDraft);
      setCurrentResult(data);
    } catch (error) {
      console.error("Recipe Generation Failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveCurrent = async () => {
    if (!user || !currentResult) return;
    await db.saveRecipe(user.email, currentResult);
    setCurrentResult(null);
    setCustomInstruction('');
    loadCollection();
    setActiveTab('collection');
  };

  const saveManual = async () => {
    if (!user || !mName.trim()) return;
    const manualRecipe: Recipe = {
        id: 'manual-' + Date.now(),
        name: mName,
        type: mealType,
        ingredients: mIngredients.split(',').map(i => i.trim()).filter(i => i),
        instructions: mInstructions,
        nutrition: "Custom family recipe",
        isManual: true,
        createdAt: Date.now()
    };
    await db.saveRecipe(user.email, manualRecipe);
    setMName('');
    setMIngredients('');
    setMInstructions('');
    setIsManualModalOpen(false);
    loadCollection();
    setActiveTab('collection');
  };

  const deleteRecipe = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await db.deleteRecipe(id, { userEmail: user.email });
    loadCollection();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-32">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-serif tracking-tight">Nur Kitchen</h2>
        <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl backdrop-blur-sm">
           <button 
             onClick={() => setActiveTab('discover')}
             className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'discover' ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
           >
             Discover
           </button>
           <button 
             onClick={() => setActiveTab('collection')}
             className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'collection' ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
           >
             Cookbook
           </button>
        </div>
      </div>

      {activeTab === 'discover' ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
             <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-[1.5rem]">
                <button 
                  onClick={() => setMealType('Sehri')}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${mealType === 'Sehri' ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  Sehri
                </button>
                <button 
                  onClick={() => setMealType('Iftar')}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${mealType === 'Iftar' ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  Iftar
                </button>
             </div>

             <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chef's Guidance</label>
                  <span className="text-[10px] text-primary-600 dark:text-primary-400 font-bold flex items-center gap-1.5"><Sparkles className="w-3 h-3"/> AI Smart Assistant</span>
                </div>
                <textarea 
                  value={customInstruction}
                  onChange={e => setCustomInstruction(e.target.value)}
                  placeholder="Tell us what's in your pantry or your mood... (e.g. 'Healthy, high protein, use dates')"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-5 text-sm outline-none focus:ring-2 focus:ring-primary-500 min-h-[120px] transition-all dark:text-slate-200"
                />
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Express Templates</label>
                <div className="flex flex-wrap gap-2">
                   {QUICK_TAGS.map(tag => (
                      <button 
                        key={tag}
                        onClick={() => handleSuggest(tag)}
                        disabled={loading}
                        className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-primary-500 dark:hover:border-primary-400 active:scale-95 transition-all disabled:opacity-50"
                      >
                         {tag}
                      </button>
                   ))}
                </div>
             </div>

             <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => handleSuggest()}
                  disabled={loading}
                  className="flex-1 bg-slate-900 dark:bg-slate-700 text-white py-5 rounded-[1.5rem] font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50"
                >
                   {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Wand2 className="w-5 h-5 text-accent-400" /> Surprise Me</>}
                </button>
                <button 
                  onClick={() => setIsManualModalOpen(true)}
                  disabled={loading}
                  className="bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-6 py-5 rounded-[1.5rem] font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 border border-primary-100 dark:border-primary-800"
                  title="Add my own recipe"
                >
                  <Plus className="w-6 h-6" />
                </button>
             </div>
          </div>

          {currentResult && (
            <div className="animate-in slide-in-from-bottom-8 duration-500">
               <div className="bg-primary-900 dark:bg-primary-950 text-white p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl border border-primary-800 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><ChefIcon className="w-56 h-56" /></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                       <span className="bg-white/10 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-primary-300 border border-white/5 backdrop-blur-sm">AI Suggestion</span>
                       <button onClick={() => setCurrentResult(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-90"><X className="w-5 h-5" /></button>
                    </div>
                    <h3 className="text-3xl font-serif mb-8 leading-tight">{currentResult.name}</h3>
                    
                    <div className="space-y-10">
                        <div>
                            <h4 className="text-[10px] font-black text-primary-400 uppercase tracking-[0.3em] mb-4">The Essentials</h4>
                            <div className="flex flex-wrap gap-2.5">
                                {currentResult.ingredients.map((ing, i) => (
                                    <span key={i} className="text-xs bg-white/10 px-4 py-2.5 rounded-2xl border border-white/5 backdrop-blur-sm">{ing}</span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-primary-400 uppercase tracking-[0.3em] mb-4">Preparation</h4>
                            <p className="text-sm text-primary-50/80 leading-relaxed font-light whitespace-pre-line">{currentResult.instructions}</p>
                        </div>
                    </div>

                    <button 
                      onClick={saveCurrent}
                      className="w-full mt-10 bg-accent-400 text-slate-900 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-accent-400/20 hover:bg-accent-300 transition-all"
                    >
                       <Save className="w-5 h-5" /> Save to Cookbook
                    </button>
                  </div>
               </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
           {savedRecipes.length === 0 ? (
             <div className="bg-white dark:bg-slate-900 p-16 text-center rounded-[3rem] border border-slate-100 dark:border-slate-800 space-y-6 transition-colors shadow-sm">
                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mx-auto border border-slate-100 dark:border-slate-700 shadow-inner">
                    <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif">Your Cookbook is Empty</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium max-w-[220px] mx-auto leading-relaxed">Curate your favorite meals or let the Nur Chef inspire you.</p>
                </div>
                <button onClick={() => setActiveTab('discover')} className="bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-primary-100 dark:border-primary-800 hover:bg-primary-100 transition-all">Start Exploring</button>
             </div>
           ) : (
             <div className="grid grid-cols-1 gap-4">
                {savedRecipes.map(recipe => (
                   <button 
                     key={recipe.id} 
                     onClick={() => setViewingRecipe(recipe)}
                     className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all text-left w-full relative overflow-hidden"
                   >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${recipe.type === 'Sehri' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-accent-50 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400'}`}>
                         {recipe.type === 'Sehri' ? <Zap className="w-6 h-6" /> : <ChefIcon className="w-6 h-6" />}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate text-base">{recipe.name}</h4>
                            {recipe.isManual && <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Manual</span>}
                         </div>
                         <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">{recipe.type} • {recipe.ingredients.length} Essentials</p>
                      </div>
                      <div className="flex gap-1.5 relative z-10">
                        <div className="p-2 text-slate-300 dark:text-slate-600 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                           <ChevronRight className="w-6 h-6" />
                        </div>
                        <div 
                          onClick={(e) => deleteRecipe(e, recipe.id)}
                          className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors active:scale-90"
                        >
                           <Trash2 className="w-5 h-5" />
                        </div>
                      </div>
                   </button>
                ))}
             </div>
           )}
        </div>
      )}

      {/* Detail Modal */}
      {viewingRecipe && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-3xl flex flex-col animate-in fade-in duration-300 overflow-y-auto">
           <div className="sticky top-0 bg-slate-900/80 backdrop-blur-md border-b border-white/5 px-6 py-5 flex items-center justify-between z-50">
              <button onClick={() => setViewingRecipe(null)} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors uppercase tracking-widest font-black text-[10px]">
                 <ArrowLeft className="w-5 h-5" />
                 <span>Back to Kitchen</span>
              </button>
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 ${viewingRecipe.type === 'Sehri' ? 'bg-blue-900/40 text-blue-400' : 'bg-accent-900/40 text-accent-400'}`}>
                {viewingRecipe.type}
              </div>
           </div>

           <div className="flex-1 max-w-2xl mx-auto w-full p-8 md:p-16 space-y-16 pb-32">
              <header className="space-y-6">
                 <h1 className="text-4xl md:text-6xl font-serif text-white text-center leading-tight">
                    {viewingRecipe.name}
                 </h1>
                 <div className="flex justify-center gap-8 text-primary-400/60 font-black text-[10px] uppercase tracking-[0.3em]">
                    <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Prep Focus</span>
                    <span className="flex items-center gap-2"><Heart className="w-4 h-4" /> Nutrition First</span>
                 </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
                 <div className="space-y-8">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] border-b border-white/10 pb-4">Ingredients</h3>
                    <ul className="space-y-5">
                       {viewingRecipe.ingredients.map((ing, i) => (
                          <li key={i} className="flex items-start gap-4">
                             <div className="mt-1.5 w-2 h-2 rounded-full bg-primary-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                             <span className="text-primary-50/70 text-sm leading-relaxed font-light">{ing}</span>
                          </li>
                       ))}
                    </ul>
                 </div>

                 <div className="md:col-span-2 space-y-8">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] border-b border-white/10 pb-4">Method</h3>
                    <div className="space-y-10">
                       <p className="text-primary-50/90 text-lg leading-relaxed font-light whitespace-pre-line tracking-wide">
                          {viewingRecipe.instructions}
                       </p>
                       <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-sm">
                          <h4 className="text-[10px] font-black text-primary-400 uppercase tracking-[0.3em] mb-4">Wellness Note</h4>
                          <p className="text-sm text-primary-100/60 leading-relaxed italic font-light">{viewingRecipe.nutrition}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-10 shadow-2xl relative animate-in slide-in-from-bottom-full duration-500 transition-colors pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
              <button onClick={() => setIsManualModalOpen(false)} className="absolute top-8 right-8 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"><X className="w-6 h-6" /></button>
              <div className="bg-primary-50 dark:bg-primary-900/30 w-14 h-14 rounded-3xl flex items-center justify-center mb-8 border border-primary-100 dark:border-primary-800"><ClipboardList className="w-7 h-7 text-primary-600 dark:text-primary-300" /></div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-8 font-serif">Add Legacy Recipe</h3>
              
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Title</label>
                    <input value={mName} onChange={e => setMName(e.target.value)} placeholder="Secret Family Pilau..." className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-5 rounded-3xl text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Items (split by comma)</label>
                    <textarea value={mIngredients} onChange={e => setMIngredients(e.target.value)} placeholder="Rice, cloves, lamb..." className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-5 rounded-3xl text-sm outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px] dark:text-white" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Method</label>
                    <textarea value={mInstructions} onChange={e => setMInstructions(e.target.value)} placeholder="Describe the love in the cooking..." className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-5 rounded-3xl text-sm outline-none focus:ring-2 focus:ring-primary-500 min-h-[140px] dark:text-white" />
                 </div>
                 <button onClick={saveManual} className="w-full bg-primary-600 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary-900/20 active:scale-95 transition-all mt-4">Commit to Cookbook</button>
              </div>
           </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[250] bg-slate-950/80 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-300">
           <div className="relative">
              <ChefHat className="w-20 h-20 text-accent-400 animate-bounce" />
              <RefreshCw className="w-28 h-28 text-primary-500/20 absolute -top-4 -left-4 animate-spin" />
           </div>
           <p className="mt-10 text-white font-serif text-2xl tracking-tight animate-pulse">Designing your meal...</p>
           <p className="text-primary-300/40 text-[10px] font-black uppercase tracking-[0.4em] mt-3">Spiritual Nutrition Analysis</p>
        </div>
      )}
    </div>
  );
};

export default Kitchen;
