import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingBag, Plus, Minus, ChevronRight, X, Trash2, 
  Facebook, MapPin, Loader2, Gift, Star, Search, 
  Anchor, Compass, Sparkles, Moon, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchSheetData, submitSheetData, SheetDish, SheetCategory } from './services/googleSheets';
import { FALLBACK_CATEGORIES, FALLBACK_DISHES } from './services/menuData';

// ==========================================
// 📋 CONFIGURACIÓN DEL MENÚ CORSARIO
// ==========================================
const RESTAURANTE_NAME = "Piratas Club";
const RESTAURANTE_SLOGAN = "Cevichería Restaurant Restobar";
const WHATSAPP_NUMBER = "51934265393"; // WhatsApp con código del país (Peru 51)
const FACEBOOK_URL = "";
const MAPS_URL = "";
const LOGO_FOOTER_PATH = ""; 
const BANNER_PATH = ""; 
const MARQUEE_TEXT = "🏴‍☠️ ¡EL MEJOR BOTÍN DEL MAR ESTÁ AQUÍ! • CEVICHES, RONDAS Y TRAGOS CORSARIOS • ¡LEVEN ANCLAS Y HAGAN SU PEDIDO! 🦑⚓ ";
const BIRTHDAY_COPY = "¡Ahoy, cumpleañero! 🏴‍☠️ Registra tu fecha especial aquí y reclama tu botín: ¡un Pisco Sour o Chilcano de cortesía para celebrar como un verdadero capitán! 🍹";

interface Dish {
  nombre: string;
  descripcion?: string;
  imagen?: string;
  precio: string;
  categoría: string;
}

interface Category {
  id: string;
  nombre: string;
  items: Dish[];
}

interface CartItem {
  nombre: string;
  precio: string;
  cantidad: number;
}

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // States for Birthday Form
  const [showBirthdayForm, setShowBirthdayForm] = useState(false);
  const [isSubmittingBirthday, setIsSubmittingBirthday] = useState(false);
  const [birthdaySuccess, setBirthdaySuccess] = useState(false);
  const [birthdayData, setBirthdayData] = useState({
    nombre: '',
    telefono: '',
    fechaNacimiento: '',
    distrito: '',
    correo: ''
  });

  // States for Review Form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewData, setReviewData] = useState({
    estrellasMozo: 0,
    estrellasComida: 0,
    comentario: ''
  });

  // Load menu data directly from local JSON to prevent any deploy-time network/CORS hangs
  useEffect(() => {
    const formattedCategories: Category[] = FALLBACK_CATEGORIES.map(c => ({
      id: c.nombre.toLowerCase().replace(/\s+/g, '-'),
      nombre: c.nombre,
      items: FALLBACK_DISHES
        .filter(d => d.categoría === c.nombre)
        .map(d => ({
          nombre: d['nombre del plato'],
          descripcion: d.descripción,
          precio: d.precio,
          imagen: d['URL de imagen'] || undefined,
          categoría: d.categoría
        }))
    })).filter(cat => cat.items.length > 0);

    setCategories(formattedCategories);
    if (formattedCategories.length > 0) {
      setActiveCategory(formattedCategories[0].id);
    }
    setLoading(false);
  }, []);

  const cartCount = useMemo(() => cart.reduce((acc, item) => acc + item.cantidad, 0), [cart]);

  // Filter categories and dishes based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    return categories.map(cat => {
      const items = cat.items.filter(dish => 
        dish.nombre.toLowerCase().includes(query) || 
        (dish.descripcion && dish.descripcion.toLowerCase().includes(query))
      );
      return { ...cat, items };
    }).filter(cat => cat.items.length > 0);
  }, [categories, searchQuery]);

  const addToCart = (dish: Dish) => {
    setCart(prev => {
      const existing = prev.find(i => i.nombre === dish.nombre && i.precio === dish.precio);
      if (existing) {
        return prev.map(i =>
          (i.nombre === dish.nombre && i.precio === dish.precio)
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        );
      }
      return [...prev, { nombre: dish.nombre, precio: dish.precio, cantidad: 1 }];
    });
  };

  const updateQuantity = (nombre: string, precio: string, delta: number) => {
    setCart(prev =>
      prev
        .map(i => {
          if (i.nombre === nombre && i.precio === precio) {
            const newQty = i.cantidad + delta;
            return newQty > 0 ? { ...i, cantidad: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const calculateTotal = () => {
    return cart.reduce((acc, item) => {
      const cleanPrice = item.precio.replace(/^[^\d]*/, '');
      const num = parseFloat(cleanPrice) || 0;
      return acc + num * item.cantidad;
    }, 0);
  };

  const sendToWhatsApp = () => {
    const total = calculateTotal();
    let message = `*🏴‍☠️ ¡AHOY PIRATAS CLUB! Deseo realizar un pedido corsario:* \n\n`;
    cart.forEach(item => {
      message += `⚓ *${item.cantidad} x ${item.nombre}* (${item.precio})\n`;
    });
    message += `\n💰 *TOTAL DEL BOTÍN: S/. ${total.toFixed(2)}*\n\n`;
    message += `🏴‍☠️ _¡Leven anclas y preparen la mesa!_ 🦑`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    const el = document.getElementById(`cat-${catId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleBirthdaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBirthday(true);
    const success = await submitSheetData('Cumpleaños', {
      timestamp: new Date().toLocaleString('es-PE'),
      nombre: birthdayData.nombre,
      telefono: birthdayData.telefono,
      fechaNacimiento: birthdayData.fechaNacimiento,
      distrito: birthdayData.distrito,
      correo: birthdayData.correo || 'No indicado'
    });
    
    setIsSubmittingBirthday(false);
    if (success) {
      setBirthdaySuccess(true);
      setTimeout(() => {
        setShowBirthdayForm(false);
        setBirthdaySuccess(false);
        setBirthdayData({ nombre: '', telefono: '', fechaNacimiento: '', distrito: '', correo: '' });
      }, 3000);
    } else {
      alert("Hubo un error al enviar tus datos. Por favor, inténtalo de nuevo.");
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewData.estrellasMozo === 0 || reviewData.estrellasComida === 0) {
      alert("Por favor califica ambas opciones con estrellas.");
      return;
    }

    setIsSubmittingReview(true);
    const success = await submitSheetData('Reseñas', {
      timestamp: new Date().toLocaleString('es-PE'),
      estrellasMozo: reviewData.estrellasMozo,
      estrellasComida: reviewData.estrellasComida,
      comentario: reviewData.comentario || 'Sin comentarios'
    });
    
    setIsSubmittingReview(false);
    if (success) {
      setReviewSuccess(true);
      setTimeout(() => {
        setShowReviewForm(false);
        setReviewSuccess(false);
        setReviewData({ estrellasMozo: 0, estrellasComida: 0, comentario: '' });
      }, 3000);
    } else {
      alert("Hubo un error al enviar tu reseña. Por favor, inténtalo de nuevo.");
    }
  };

  // Helper to render customized SVG background decorations for dishes with empty images
  const renderDishPlaceholder = (category: string) => {
    const isBeverage = ["Cervezas", "Cervezas Artesanales", "Tragos", "Gaseosas", "Bebidas y Refrescos", "Vinos Artesanales"].includes(category);
    const isCeviche = ["Ceviches", "Leche de Tigre", "Tiraditos", "Ronda Marina"].includes(category);
    const isHot = ["Calientes", "Pastas", "Fuentes Simples", "Fuentes (Dúos Familiares)", "Fuentes (Tríos Familiares)"].includes(category);

    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800/80 relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
        {/* Glowing nautical circle background */}
        <div className="absolute w-24 h-24 rounded-full border border-cyan-500/20 flex items-center justify-center animate-pulse" />
        
        {isBeverage ? (
          <svg className="w-12 h-12 text-amber-500 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9s2.015-9 4.5-9m0 0a3.3 3.3 0 100-6.6 3.3 3.3 0 000 6.6z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18 8h1a2 2 0 012 2v2a2 2 0 01-2 2h-1M6 8H5a2 2 0 00-2 2v2a2 2 0 002 2h1" />
          </svg>
        ) : isCeviche ? (
          <svg className="w-12 h-12 text-cyan-400 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M22 12c-2.667-1.333-5.333-1.333-8 0s-5.333 1.333-8 0-5.333-1.333-8 0" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2 17c2.667-1.333 5.333-1.333 8 0s5.333 1.333 8 0 5.333-1.333 8 0" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 9c-1-2.5-3-3.5-5-3.5s-4 1-5 3.5c1.5.5 3 1 5 1s3.5-.5 5-1z" />
          </svg>
        ) : isHot ? (
          <svg className="w-12 h-12 text-amber-500 relative z-10 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M20.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
          </svg>
        ) : (
          <svg className="w-12 h-12 text-cyan-500 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9s2.015-9 4.5-9" />
          </svg>
        )}
        <span className="text-[10px] text-cyan-400/50 uppercase tracking-widest font-montserrat font-bold mt-2">Piratas Botín</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-dark">
        <div className="relative w-16 h-16 mb-4">
          <Loader2 className="w-16 h-16 text-primary animate-spin absolute" />
          <Anchor className="w-8 h-8 text-secondary absolute top-4 left-4 sway-item" />
        </div>
        <p className="font-marker text-secondary tracking-widest uppercase text-sm animate-pulse">¡Cargando el Botín...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-dark min-h-screen relative shadow-2xl overflow-hidden flex flex-col font-sans border-x border-slate-800">
      
      {/* Decorative Bubble Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="bubble w-4 h-4 left-[10%]" style={{ animationDelay: '0s', animationDuration: '8s' }} />
        <div className="bubble w-6 h-6 left-[40%]" style={{ animationDelay: '2s', animationDuration: '14s' }} />
        <div className="bubble w-3 h-3 left-[75%]" style={{ animationDelay: '5s', animationDuration: '10s' }} />
        <div className="bubble w-5 h-5 left-[85%]" style={{ animationDelay: '1s', animationDuration: '12s' }} />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 bg-dark/90 backdrop-blur-md z-50 px-5 py-4 flex justify-between items-center border-b border-cyan-500/20 shadow-neon-cyan">
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-1.5">
            <Anchor className="text-secondary w-6 h-6 sway-item" />
            <h1 className="font-title text-3xl text-neon-cyan leading-none tracking-wide">{RESTAURANTE_NAME}</h1>
          </div>
          <span className="font-sans text-[10px] text-neon-gold font-bold tracking-wider mt-1.5 uppercase opacity-90">{RESTAURANTE_SLOGAN}</span>
        </div>
        <div className="flex items-center gap-2">
          {FACEBOOK_URL && (
            <motion.a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-slate-800 border border-slate-700/60 rounded-full flex items-center justify-center text-cyan-400 hover:border-cyan-500/50 hover:shadow-neon-cyan cursor-pointer transition-all duration-200"
            >
              <Facebook size={18} />
            </motion.a>
          )}
          {MAPS_URL && (
            <motion.a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-slate-800 border border-slate-700/60 rounded-full flex items-center justify-center text-cyan-400 hover:border-cyan-500/50 hover:shadow-neon-cyan cursor-pointer transition-all duration-200"
            >
              <MapPin size={18} />
            </motion.a>
          )}
          <motion.div
            onClick={() => cartCount > 0 && setShowSummary(true)}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 bg-slate-800 border border-slate-700/60 rounded-full flex items-center justify-center relative cursor-pointer hover:border-cyan-500/50 hover:shadow-neon-cyan transition-all duration-200"
          >
            <ShoppingBag size={18} className="text-cyan-400" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-secondary text-dark rounded-full text-[10px] font-extrabold flex items-center justify-center px-1 border border-dark shadow-neon-gold">
                {cartCount}
              </span>
            )}
          </motion.div>
        </div>
      </header>

      {/* MARQUEE */}
      <div className="w-full bg-cyan-950/80 border-b border-cyan-500/30 py-2.5 overflow-hidden flex items-center shadow-inner relative z-10">
        <div className="animate-marquee flex gap-6 text-cyan-300 font-marker text-[11px] tracking-widest uppercase whitespace-nowrap">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="flex items-center gap-2">
              {MARQUEE_TEXT}
            </span>
          ))}
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="px-5 pt-4 relative z-10">
        <div className="relative w-full">
          <input 
            type="text" 
            placeholder="Buscar ceviche, ronda, pisco..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-cyan-500/20 text-gray-200 text-sm rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:shadow-neon-cyan transition-all duration-300 font-medium placeholder-cyan-500/40"
          />
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-cyan-500/60" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3.5 text-cyan-500/60 hover:text-cyan-400"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* BIRTHDAY WIDGET */}
      <div className="px-5 pt-4 relative z-10">
        <motion.button 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          animate={{ 
            boxShadow: [
              "0px 0px 4px 0px rgba(245,158,11,0.3)", 
              "0px 0px 16px 4px rgba(245,158,11,0.1)", 
              "0px 0px 4px 0px rgba(245,158,11,0.3)"
            ] 
          }}
          transition={{ repeat: Infinity, duration: 2 }}
          onClick={() => setShowBirthdayForm(true)}
          className="w-full bg-gradient-to-r from-amber-600/90 to-amber-700/90 hover:from-amber-600 hover:to-amber-700 text-white p-3.5 rounded-2xl flex items-center justify-between gap-3 border border-amber-500/40 relative overflow-hidden group shadow-neon-gold"
        >
          <div className="absolute inset-0 shimmer opacity-20 mix-blend-overlay"></div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-dark/50 border border-amber-500/30 rounded-xl flex items-center justify-center shrink-0">
              <Gift size={18} className="text-secondary animate-bounce" />
            </div>
            <div className="text-left">
              <p className="font-marker text-xs text-secondary tracking-wider uppercase">¡Ahoy, Cumpleañero! 🏴‍☠️</p>
              <p className="text-[10px] text-gray-200 font-medium line-clamp-1">Reclama tu botín de cortesía aquí</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-secondary shrink-0 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </div>

      {/* DYNAMIC PARCHMENT BANNER (Placeholder fallback) */}
      {!BANNER_PATH && (
        <div className="px-5 pt-4 pb-2 relative z-10">
          <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 flex flex-col items-center justify-center text-center aspect-[2.2/1]">
            <Compass className="w-8 h-8 text-cyan-400 opacity-60 mb-2 animate-spin-slow" />
            <h2 className="font-title text-2xl text-neon-cyan leading-tight mb-1">Cevichería Restobar Nocturno</h2>
            <p className="text-[10px] font-marker text-neon-gold tracking-widest uppercase">¡EL MEJOR BOTÍN DEL MAR!</p>
          </div>
        </div>
      )}

      {/* CATEGORIES NAVIGATION DECK */}
      <div className="px-5 py-3.5 overflow-x-auto no-scrollbar sticky top-[73px] bg-dark/95 backdrop-blur-md z-45 border-b border-slate-800/80 shadow-md">
        <div className="flex gap-2 w-max">
          {filteredCategories.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className={`px-4 py-2.5 rounded-full text-[11px] font-montserrat font-bold whitespace-nowrap transition-all duration-300 border cursor-pointer
                  ${isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark border-cyan-400 shadow-neon-cyan font-extrabold'
                    : 'bg-slate-850 text-gray-400 border-slate-800 hover:border-cyan-500/30 hover:text-cyan-400'
                  }`}
              >
                {cat.nombre}
              </button>
            );
          })}
        </div>
      </div>

      {/* DISHES LIST */}
      <main className="flex-1 overflow-y-auto pb-32 px-5 relative z-10">
        {filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Compass className="w-12 h-12 text-cyan-500/40 mb-3 animate-pulse" />
            <p className="font-marker text-secondary text-sm">No encontramos ningún plato corsario...</p>
            <p className="text-[11px] text-gray-500 mt-1">¡Prueba buscando con otro término, marinero!</p>
          </div>
        ) : (
          filteredCategories.map(cat => (
            <section key={cat.id} id={`cat-${cat.id}`} className="mb-10 scroll-mt-28">
              <div className="mb-5 pt-4">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <Anchor className="text-cyan-400 sway-item" size={20} />
                  <h3 className="font-title text-neon-cyan text-2xl tracking-wide category-underline">
                    {cat.nombre}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {cat.items.map((dish, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -3 }}
                    className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col shadow-lg card-hover-neon"
                  >
                    <div 
                      className="bg-slate-950 aspect-square flex items-center justify-center relative overflow-hidden cursor-pointer group"
                      onClick={() => dish.imagen && setSelectedImage(dish.imagen)}
                    >
                      {dish.imagen ? (
                        <img 
                          src={dish.imagen} 
                          alt={dish.nombre} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            // Show beautiful SVG fallback
                            if (e.currentTarget.parentElement) {
                              const placeholderEl = document.createElement('div');
                              placeholderEl.className = 'w-full h-full';
                              e.currentTarget.parentElement.appendChild(placeholderEl);
                            }
                          }}
                        />
                      ) : renderDishPlaceholder(dish.categoría)}
                    </div>
                    
                    <div className="p-3.5 flex flex-col flex-1">
                      <h4 className="font-montserrat font-bold text-gray-200 text-xs leading-snug mb-1.5 line-clamp-2 min-h-[2rem]">
                        {dish.nombre}
                      </h4>
                      {dish.descripcion && (
                        <p className="text-[10px] text-gray-400 leading-snug mb-3 line-clamp-3 font-sans">
                          {dish.descripcion}
                        </p>
                      )}
                      <div className="flex-1"></div>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/60">
                        <span className="font-montserrat font-extrabold text-neon-gold text-[13px] whitespace-nowrap">
                          {dish.precio}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => addToCart(dish)}
                          className="w-7 h-7 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 cursor-pointer"
                        >
                          <Plus size={14} strokeWidth={2.5} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          ))
        )}

        {/* CUSTOM DECORATIVE PARCHMENT BOX FOR CLIENT FEEDBACK */}
        <section className="mt-8 mb-4 border border-cyan-500/20 bg-slate-900 rounded-2xl p-5 text-center shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-10">
            <Compass className="w-full h-full text-cyan-400" />
          </div>
          <h3 className="font-title text-neon-cyan text-xl leading-tight mb-2 flex items-center justify-center gap-1.5">
            ¿Cómo estuvo todo, Capitán?
          </h3>
          <p className="text-[10px] text-gray-400 mb-4 px-4 font-sans leading-snug">Ayúdanos a mejorar el botín calificando tu experiencia hoy</p>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowReviewForm(true)}
            className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-dark px-6 py-3 rounded-xl font-montserrat font-bold text-xs shadow-neon-cyan flex items-center justify-center gap-2 mx-auto w-full cursor-pointer"
          >
            <Star size={16} className="fill-dark" />
            Reseñar nuestra comida
          </motion.button>
        </section>

        {/* FOOTER */}
        <footer className="mt-8 pt-8 pb-10 border-t border-slate-800 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 mb-2">
            <Anchor className="text-secondary w-5 h-5 sway-item" />
            <p className="font-title text-2xl text-neon-cyan">{RESTAURANTE_NAME}</p>
          </div>
          <p className="text-[9px] text-gray-500 font-medium font-sans max-w-[200px] leading-relaxed mb-6 uppercase tracking-wider">
            {RESTAURANTE_SLOGAN}
          </p>
          <p className="text-[9px] text-gray-500 font-medium">© 2026 Todos los derechos reservados.</p>
        </footer>

        {/* TYMA BRANDING */}
        <div className="bg-dark py-6 flex flex-col items-center justify-center border-t border-slate-900">
          <p className="text-[9px] font-bold tracking-[0.2em] uppercase mb-1 opacity-55 text-gray-500">Digital Menu Experience</p>
          <motion.a 
            href="https://tymasolutions.lat/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-bold text-xs tracking-tight group cursor-pointer"
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-gray-400 group-hover:text-cyan-400 transition-colors duration-200">Hecho por Tyma</span>
            <span className="text-[#00BFFF] group-hover:text-cyan-300 transition-colors duration-200">Solutions</span>
          </motion.a>
        </div>
      </main>

      {/* FLOAT ORDER BAR DRAWER BUTTON */}
      <AnimatePresence>
        {cartCount > 0 && !showSummary && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 w-full max-w-md p-5 z-40"
          >
            <div className="glass rounded-[2rem] p-4 flex items-center justify-between border border-cyan-500/30 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center relative overflow-hidden shrink-0 shadow-neon-cyan">
                  <div className="shimmer absolute inset-0 opacity-20"></div>
                  <ShoppingBag size={20} className="text-dark font-black" />
                </div>
                <div>
                  <p className="text-[9px] font-extrabold text-cyan-400 uppercase tracking-widest">Tu Botín</p>
                  <p className="font-montserrat font-extrabold text-gray-200 text-sm">{cartCount} Delicias</p>
                </div>
              </div>
              <button
                onClick={() => setShowSummary(true)}
                className="bg-gradient-to-r from-secondary to-amber-500 text-dark px-5 py-3 rounded-xl flex items-center gap-1.5 shadow-neon-gold font-montserrat font-bold text-xs cursor-pointer hover:scale-[1.02] transition-transform"
              >
                Ver Pedido
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DRAWER MODAL - SUMMARY CART */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-dark/80 backdrop-blur-sm flex items-end justify-center p-4 lg:p-0"
            onClick={() => setShowSummary(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-slate-900 border-t border-cyan-500/20 w-full max-w-md rounded-t-[3rem] p-6 max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6 pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Anchor className="text-cyan-400 w-5 h-5 sway-item" />
                  <h2 className="font-title text-2xl text-neon-cyan">Botín Elegido</h2>
                </div>
                <button
                  onClick={() => setShowSummary(false)}
                  className="w-9 h-9 bg-slate-850 border border-slate-800 rounded-full flex items-center justify-center text-gray-400 hover:text-cyan-400 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3.5 mb-8 flex-1 overflow-y-auto pr-1">
                {cart.map(item => (
                  <div
                    key={`${item.nombre}-${item.precio}`}
                    className="flex items-center gap-4 bg-slate-950/70 border border-slate-850 p-4 rounded-2xl"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-montserrat font-bold text-gray-200 text-xs truncate">{item.nombre}</h4>
                      <p className="text-[11px] text-neon-gold font-extrabold mt-0.5">{item.precio}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 shrink-0">
                      <button onClick={() => updateQuantity(item.nombre, item.precio, -1)} className="text-gray-500 hover:text-cyan-400 cursor-pointer">
                        <Minus size={14} />
                      </button>
                      <span className="font-montserrat font-bold text-xs text-gray-300 w-4 text-center">{item.cantidad}</span>
                      <button onClick={() => updateQuantity(item.nombre, item.precio, 1)} className="text-cyan-400 hover:text-cyan-300 cursor-pointer">
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => updateQuantity(item.nombre, item.precio, -item.cantidad)}
                      className="text-red-400/80 hover:text-red-400 ml-1 cursor-pointer shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-800 pt-6 mb-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-montserrat font-bold text-gray-400">Total del Botín</h3>
                  <h3 className="text-xl font-montserrat font-extrabold text-neon-gold">S/. {calculateTotal().toFixed(2)}</h3>
                </div>
              </div>

              <button
                onClick={sendToWhatsApp}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-dark py-4 rounded-xl flex items-center justify-center gap-2 shadow-neon-cyan hover:scale-[1.01] transition-transform font-montserrat font-black text-xs uppercase tracking-wider cursor-pointer border border-emerald-400/20"
              >
                Enviar Pedido a WhatsApp
                <ChevronRight size={16} strokeWidth={3} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ENLARGED PHOTO MODAL */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-dark/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              className="absolute top-6 right-6 w-11 h-11 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-white hover:bg-slate-700 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
            >
              <X size={22} />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage}
              alt="Plato ampliado"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-cyan-500/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* BIRTHDAY FORM MODAL */}
      <AnimatePresence>
        {showBirthdayForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-dark/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowBirthdayForm(false)}
          >
            <motion.div
              initial={{ scale: 0.93, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 15 }}
              className="bg-slate-900 border border-cyan-500/20 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowBirthdayForm(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-slate-850 border border-slate-800 rounded-full flex items-center justify-center text-gray-400 hover:text-cyan-400 cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="flex flex-col items-center text-center mb-5 mt-2">
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mb-3">
                  <Gift size={22} className="text-secondary animate-bounce" />
                </div>
                <h2 className="font-title text-2xl text-neon-gold leading-none mb-2">¡Tu Botín Especial!</h2>
                <p className="text-[10px] text-gray-400 font-sans leading-normal px-2">{BIRTHDAY_COPY}</p>
              </div>

              {birthdaySuccess ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-center text-xs font-bold font-montserrat">
                  ⚓ ¡TUS DATOS HAN SIDO REGISTRADOS, CAPITÁN! ¡PREPARA TU ANCLA EN TU DÍA!
                </div>
              ) : (
                <form onSubmit={handleBirthdaySubmit} className="space-y-3.5">
                  <div>
                    <label className="text-[9px] font-extrabold text-cyan-400 uppercase ml-1">Nombre Completo</label>
                    <input 
                      required 
                      type="text" 
                      value={birthdayData.nombre} 
                      onChange={e => setBirthdayData({...birthdayData, nombre: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder-gray-600 font-medium" 
                      placeholder="Ej. Juan Pérez" 
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-extrabold text-cyan-400 uppercase ml-1">Teléfono / WhatsApp</label>
                    <input 
                      required 
                      type="tel" 
                      minLength={9} 
                      maxLength={11} 
                      pattern="[0-9]*" 
                      value={birthdayData.telefono} 
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setBirthdayData({...birthdayData, telefono: val});
                      }} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder-gray-600 font-medium" 
                      placeholder="Ej. 987654321" 
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-extrabold text-cyan-400 uppercase ml-1">Fecha de Nacimiento</label>
                    <input 
                      required 
                      type="date" 
                      value={birthdayData.fechaNacimiento} 
                      onChange={e => setBirthdayData({...birthdayData, fechaNacimiento: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-medium" 
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-extrabold text-cyan-400 uppercase ml-1">Distrito</label>
                    <input 
                      required 
                      type="text" 
                      value={birthdayData.distrito} 
                      onChange={e => setBirthdayData({...birthdayData, distrito: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder-gray-600 font-medium" 
                      placeholder="Ej. Miraflores" 
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-extrabold text-cyan-400 uppercase ml-1">Correo Electrónico (Opcional)</label>
                    <input 
                      type="email" 
                      value={birthdayData.correo} 
                      onChange={e => setBirthdayData({...birthdayData, correo: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder-gray-600 font-medium" 
                      placeholder="correo@ejemplo.com" 
                    />
                  </div>
                  
                  <button 
                    disabled={isSubmittingBirthday} 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-secondary to-amber-500 text-dark py-3.5 rounded-xl font-montserrat font-bold text-xs uppercase tracking-wider shadow-neon-gold mt-3 disabled:opacity-70 flex justify-center items-center cursor-pointer"
                  >
                    {isSubmittingBirthday ? <Loader2 size={16} className="animate-spin" /> : "Guardar mis datos en el cofre"}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REVIEW FORM MODAL */}
      <AnimatePresence>
        {showReviewForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-dark/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowReviewForm(false)}
          >
            <motion.div
              initial={{ scale: 0.93, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 15 }}
              className="bg-slate-900 border border-cyan-500/20 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowReviewForm(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-slate-850 border border-slate-800 rounded-full flex items-center justify-center text-gray-400 hover:text-cyan-400 cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="flex flex-col items-center text-center mb-5 mt-2">
                <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/30 rounded-full flex items-center justify-center mb-3">
                  <Star size={22} className="text-cyan-400 fill-cyan-400 animate-pulse" />
                </div>
                <h2 className="font-title text-2xl text-neon-cyan leading-none mb-2">¡Reseñar tu Aventura!</h2>
                <p className="text-[10px] text-gray-400 font-sans leading-normal">Tu calificación nos ayuda a gobernar mejor los mares gastronómicos.</p>
              </div>

              {reviewSuccess ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-center text-xs font-bold font-montserrat">
                  ⚓ ¡GRACIAS CAPITÁN! TU VALIOSA OPINIÓN HA SIDO DEPOSITADA EN NUESTRA HOJA DE RUTA.
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-4.5">
                  
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col items-center">
                    <p className="text-[10px] font-extrabold text-cyan-400 uppercase mb-2">Atención en el Barco (Mozos)</p>
                    <div className="flex gap-1.5">
                      {[1,2,3,4,5].map(star => (
                        <button 
                          key={star} type="button" 
                          onClick={() => setReviewData({...reviewData, estrellasMozo: star})}
                          className="p-1 transition-transform hover:scale-115 cursor-pointer"
                        >
                          <Star size={24} className={reviewData.estrellasMozo >= star ? "text-amber-500 fill-amber-500" : "text-slate-700"} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col items-center">
                    <p className="text-[10px] font-extrabold text-cyan-400 uppercase mb-2">Calidad de la Pesca (Comida)</p>
                    <div className="flex gap-1.5">
                      {[1,2,3,4,5].map(star => (
                        <button 
                          key={star} type="button" 
                          onClick={() => setReviewData({...reviewData, estrellasComida: star})}
                          className="p-1 transition-transform hover:scale-115 cursor-pointer"
                        >
                          <Star size={24} className={reviewData.estrellasComida >= star ? "text-amber-500 fill-amber-500" : "text-slate-700"} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-extrabold text-cyan-400 uppercase ml-1">Mensaje en la botella (Comentarios)</label>
                    <textarea 
                      rows={3} 
                      value={reviewData.comentario} 
                      onChange={e => setReviewData({...reviewData, comentario: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none mt-1.5 placeholder-gray-700 font-medium" 
                      placeholder="Cuéntanos tu opinión marinera..." 
                    />
                  </div>
                  
                  <button 
                    disabled={isSubmittingReview} 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-dark py-3.5 rounded-xl font-montserrat font-bold text-xs uppercase tracking-wider shadow-neon-cyan mt-2 disabled:opacity-70 flex justify-center items-center cursor-pointer border border-cyan-400/20"
                  >
                    {isSubmittingReview ? <Loader2 size={16} className="animate-spin" /> : "Enviar Reseña a la Central"}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
