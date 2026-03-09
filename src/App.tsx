import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, MapPin, Home, Building2, User, Plus, 
  MessageSquare, Calendar, Star, CheckCircle, 
  Menu, X, Filter, ArrowRight, IndianRupee,
  Warehouse, Store, Briefcase, Crown, Zap, ShieldCheck,
  CreditCard, Wallet, Smartphone, Check, Upload, Trash2, Copy, ExternalLink
} from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { suggestRent, parseSearchQuery, verifyDocument } from './services/geminiService';
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for Leaflet default icon issue in React/Vite
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// --- Types ---
interface Property {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: 'Residential' | 'Commercial';
  sub_category: string;
  price: number;
  deposit: number;
  size: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  images: string[];
  amenities: string[];
  verified: boolean;
  owner_verified?: boolean;
}

// --- Mock Data & State ---
const MOCK_USER = {
  id: 'user_1',
  name: 'Rahul Sharma',
  email: 'rahul@example.com',
  role: 'tenant',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul'
};

// --- Components ---

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-red-600 to-red-500 text-white">
      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut", type: "spring", bounce: 0.4 }}
        className="text-6xl font-black tracking-tighter mb-4"
      >
        Kirayo
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="text-lg font-medium opacity-90"
      >
        Poore India ke saare rentals ek jagah
      </motion.p>
    </div>
  );
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-black text-primary tracking-tighter">Kirayo</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/search" className="text-gray-600 hover:text-primary font-medium">Search</Link>
            <Link to="/premium" className="text-gray-600 hover:text-primary font-medium flex items-center gap-1">
              <Crown size={16} className="text-amber-500" /> Premium
            </Link>
            <Link to="/dashboard" className="text-gray-600 hover:text-primary font-medium">Dashboard</Link>
            <Link to="/post" className="bg-primary text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-primary-dark transition-colors">
              <Plus size={18} /> Post Property
            </Link>
            <div className="flex items-center gap-2 border-l pl-8">
              <img src={MOCK_USER.avatar} alt="User" className="w-8 h-8 rounded-full border border-gray-200" />
              <span className="text-sm font-semibold">{MOCK_USER.name}</span>
            </div>
          </div>

          <button className="md:hidden text-gray-600" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b overflow-hidden"
          >
            <div className="px-4 py-4 space-y-4">
              <Link to="/search" className="block text-gray-600 font-medium" onClick={() => setIsOpen(false)}>Search</Link>
              <Link to="/dashboard" className="block text-gray-600 font-medium" onClick={() => setIsOpen(false)}>Dashboard</Link>
              <Link to="/post" className="block bg-primary text-white px-4 py-2 rounded-lg text-center font-bold" onClick={() => setIsOpen(false)}>Post Property</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const PropertyCard = ({ property }: { property: Property }) => (
  <Link to={`/property/${property.id}`} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
    <div className="relative aspect-[4/3] overflow-hidden">
      <img 
        src={property.images[0] || 'https://picsum.photos/seed/property/800/600'} 
        alt={property.title} 
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
      />
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-primary flex items-center gap-1">
        {property.category === 'Residential' ? <Home size={12} /> : <Building2 size={12} />}
        {property.sub_category}
      </div>
      {property.owner_verified && (
        <div className="absolute top-3 right-3 bg-emerald-500 text-white p-1 rounded-full shadow-lg" title="Verified Owner">
          <CheckCircle size={14} />
        </div>
      )}
    </div>
    <div className="p-4">
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-bold text-gray-900 truncate flex-1">{property.title}</h3>
        <span className="text-primary font-black flex items-center">
          <IndianRupee size={14} />{property.price.toLocaleString()}<span className="text-[10px] text-gray-400 font-normal ml-0.5">/mo</span>
        </span>
      </div>
      <p className="text-gray-500 text-xs flex items-center gap-1 mb-3">
        <MapPin size={12} /> {property.city}
      </p>
      <div className="flex gap-2">
        <span className="text-[10px] bg-gray-50 text-gray-600 px-2 py-1 rounded-md border border-gray-100">{property.size}</span>
        {property.amenities.slice(0, 2).map(a => (
          <span key={a} className="text-[10px] bg-gray-50 text-gray-600 px-2 py-1 rounded-md border border-gray-100">{a}</span>
        ))}
      </div>
    </div>
  </Link>
);

const HomeView = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/properties')
      .then(res => res.json())
      .then(data => setProperties(data));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      <section className="relative h-[500px] flex items-center justify-center overflow-hidden bg-gray-900">
        <img 
          src="https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=80&w=2000" 
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          alt="Hero"
        />
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight"
          >
            Poore India ke saare rentals ek jagah!
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-white/90 mb-10 font-medium"
          >
            Direct owner se deal karein. Har city, town aur village tak.
          </motion.p>
          
          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row gap-2 bg-white p-2 rounded-2xl md:rounded-full shadow-2xl max-w-2xl mx-auto"
          >
            <div className="flex-1 flex items-center px-4 gap-3">
              <Search className="text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Try: 2BHK in Indore under 15k..." 
                className="w-full py-3 outline-none text-gray-800 font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="bg-primary text-white px-8 py-3 rounded-xl md:rounded-full font-bold hover:bg-primary-dark transition-all">
              Search
            </button>
          </motion.form>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-black mb-8">Browse Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { name: 'House', icon: Home, color: 'bg-red-50 text-red-600' },
            { name: 'Room/PG', icon: User, color: 'bg-orange-50 text-orange-600' },
            { name: 'Shop', icon: Store, color: 'bg-blue-50 text-blue-600' },
            { name: 'Godown', icon: Warehouse, color: 'bg-emerald-50 text-emerald-600' },
            { name: 'Office', icon: Briefcase, color: 'bg-purple-50 text-purple-600' },
          ].map((cat) => (
            <button key={cat.name} className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-gray-100 hover:border-primary hover:shadow-lg transition-all group">
              <div className={`${cat.color} p-4 rounded-2xl group-hover:scale-110 transition-transform`}>
                <cat.icon size={24} />
              </div>
              <span className="font-bold text-gray-700">{cat.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Properties */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-black">Featured Listings</h2>
            <p className="text-gray-500 font-medium">Handpicked rentals across India</p>
          </div>
          <Link to="/search" className="text-primary font-bold flex items-center gap-1 hover:underline">
            View All <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {properties.slice(0, 8).map(p => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </section>
    </div>
  );
};

const PostPropertyView = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Residential',
    sub_category: '1BHK',
    price: 0,
    deposit: 0,
    size: '',
    address: '',
    city: '',
    amenities: [] as string[],
    images: [] as string[]
  });
  const [aiSuggestion, setAiSuggestion] = useState<{ suggestedRent: number; reasoning: string } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/users/${MOCK_USER.id}`)
      .then(res => res.json())
      .then(data => setUser(data));
  }, []);

  const handleSuggestRent = async () => {
    if (!formData.city || !formData.size) return;
    setLoadingAi(true);
    try {
      const suggestion = await suggestRent(formData);
      setAiSuggestion(suggestion);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, reader.result as string].slice(0, 5)
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (user?.plan === 'free' && user?.listings_this_month >= 3) {
      setError("Free limit khatam! Premium plan le lo for unlimited postings.");
      setTimeout(() => navigate('/premium'), 2000);
      return;
    }

    const id = Math.random().toString(36).substr(2, 9);
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, id, owner_id: MOCK_USER.id, lat: 22.7196, lng: 75.8577 })
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      if (data.error.includes("Premium")) {
        setTimeout(() => navigate('/premium'), 2000);
      }
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 mb-6 font-bold text-center"
        >
          {error}
        </motion.div>
      )}
      <div className="mb-10">
        <h1 className="text-3xl font-black mb-2">Post Your Property</h1>
        <p className="text-gray-500 font-medium">Fill in the details to find your perfect tenant.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
              <div className="grid grid-cols-2 gap-4">
                {['Residential', 'Commercial'].map(c => (
                  <button 
                    key={c}
                    onClick={() => setFormData({ ...formData, category: c as any })}
                    className={`p-4 rounded-xl border-2 font-bold transition-all ${formData.category === c ? 'border-primary bg-red-50 text-primary' : 'border-gray-100 text-gray-500'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Sub Category</label>
              <select 
                className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 outline-none focus:border-primary"
                value={formData.sub_category}
                onChange={e => setFormData({ ...formData, sub_category: e.target.value })}
              >
                {formData.category === 'Residential' ? (
                  <>
                    <option>1RK</option>
                    <option>1BHK</option>
                    <option>2BHK</option>
                    <option>3BHK</option>
                    <option>PG/Hostel</option>
                  </>
                ) : (
                  <>
                    <option>Shop</option>
                    <option>Godown</option>
                    <option>Office</option>
                  </>
                )}
              </select>
            </div>
            <button onClick={() => setStep(2)} className="w-full bg-primary text-white py-4 rounded-xl font-bold">Next Step</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">City / Village</label>
                <input 
                  type="text" 
                  className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 outline-none focus:border-primary"
                  placeholder="e.g. Indore"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Size (sqft)</label>
                <input 
                  type="text" 
                  className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 outline-none focus:border-primary"
                  placeholder="e.g. 1200"
                  value={formData.size}
                  onChange={e => setFormData({ ...formData, size: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Full Address</label>
              <textarea 
                className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 outline-none focus:border-primary h-24"
                placeholder="Complete address with landmark"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 border-2 border-gray-100 py-4 rounded-xl font-bold text-gray-500">Back</button>
              <button onClick={() => { setStep(3); handleSuggestRent(); }} className="flex-1 bg-primary text-white py-4 rounded-xl font-bold">Next Step</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
              <div className="flex items-center gap-2 text-primary font-black mb-2">
                <Star size={18} fill="currentColor" /> Kirayo AI Suggestion
              </div>
              {loadingAi ? (
                <div className="animate-pulse flex space-y-2 flex-col">
                  <div className="h-4 bg-red-200 rounded w-1/4"></div>
                  <div className="h-3 bg-red-200 rounded w-full"></div>
                </div>
              ) : aiSuggestion ? (
                <div>
                  <div className="text-2xl font-black text-primary mb-1">₹{aiSuggestion.suggestedRent.toLocaleString()}</div>
                  <p className="text-xs text-red-700 font-medium">{aiSuggestion.reasoning}</p>
                </div>
              ) : (
                <p className="text-xs text-red-700">Enter city and size to get AI suggestion.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Monthly Rent (₹)</label>
                <input 
                  type="number" 
                  className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 outline-none focus:border-primary"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Security Deposit (₹)</label>
                <input 
                  type="number" 
                  className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 outline-none focus:border-primary"
                  value={formData.deposit}
                  onChange={e => setFormData({ ...formData, deposit: Number(e.target.value) })}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Property Title</label>
              <input 
                type="text" 
                className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 outline-none focus:border-primary"
                placeholder="e.g. Spacious 2BHK in Vijay Nagar"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Property Photos (Max 5)</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
                {formData.images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100 group">
                    <img src={img} className="w-full h-full object-cover" alt="Property" />
                    <button 
                      onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-500 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {formData.images.length < 5 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-red-50 transition-all group">
                    <div className="bg-gray-50 p-2 rounded-full group-hover:bg-red-100 transition-colors">
                      <Upload size={20} className="text-gray-400 group-hover:text-primary" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-wider">Add Photo</span>
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                  </label>
                )}
              </div>
              <p className="text-[10px] text-gray-400 font-medium">Upload up to 5 high-quality photos of your property.</p>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="flex-1 border-2 border-gray-100 py-4 rounded-xl font-bold text-gray-500">Back</button>
              <button onClick={handleSubmit} className="flex-1 bg-primary text-white py-4 rounded-xl font-bold">Post Property</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SearchView = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filtered, setFiltered] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const location = useLocation();

  useEffect(() => {
    fetch('/api/properties')
      .then(res => res.json())
      .then(data => {
        setProperties(data);
        setFiltered(data);
      });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q) {
      setSearchQuery(q);
      handleAiSearch(q);
    }
  }, [location.search]);

  const handleAiSearch = async (query: string) => {
    setLoading(true);
    try {
      const parsed = await parseSearchQuery(query);
      let results = [...properties];
      if (parsed.city) results = results.filter(p => p.city.toLowerCase().includes(parsed.city.toLowerCase()));
      if (parsed.category) results = results.filter(p => p.category === parsed.category);
      if (parsed.maxPrice) results = results.filter(p => p.price <= parsed.maxPrice);
      setFiltered(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="w-full md:w-64 space-y-8">
          <div>
            <h3 className="text-lg font-black mb-4 flex items-center gap-2">
              <Filter size={18} /> Filters
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Category</label>
                <div className="space-y-2">
                  {['Residential', 'Commercial'].map(c => (
                    <label key={c} className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <input type="checkbox" className="accent-primary" /> {c}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Budget</label>
                <input type="range" className="w-full accent-primary" min="0" max="100000" step="5000" />
                <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-1">
                  <span>₹0</span>
                  <span>₹1L+</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Search Results */}
        <main className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex gap-2">
              <input 
                type="text" 
                className="flex-1 px-4 py-3 outline-none font-medium"
                placeholder="Search with AI: 2BHK in Indore under 15k..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAiSearch(searchQuery)}
              />
              <button 
                onClick={() => handleAiSearch(searchQuery)}
                className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"
              >
                {loading ? 'Searching...' : <><Search size={18} /> Search</>}
              </button>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
              >
                Grid
              </button>
              <button 
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'map' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
              >
                Map
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(p => (
                <PropertyCard key={p.id} property={p} />
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                    <Search size={40} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900">No properties found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-[600px] rounded-3xl overflow-hidden border border-gray-100 shadow-sm z-0">
              <MapContainer center={[22.7196, 75.8577]} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {filtered.map(p => (
                  <Marker key={p.id} position={[p.lat || 22.7196, p.lng || 75.8577]}>
                    <Popup>
                      <div className="p-1">
                        <img src={p.images[0]} className="w-full h-24 object-cover rounded-lg mb-2" alt="" />
                        <h4 className="font-bold text-sm">{p.title}</h4>
                        <p className="text-primary font-black text-xs">₹{p.price.toLocaleString()}/mo</p>
                        <Link to={`/property/${p.id}`} className="text-[10px] text-blue-600 font-bold mt-1 block">View Details</Link>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const PropertyDetailView = () => {
  const { id } = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/properties')
      .then(res => res.json())
      .then(data => setProperty(data.find((p: any) => p.id === id)));
  }, [id]);

  if (!property) return <div className="p-20 text-center font-bold">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-video rounded-3xl overflow-hidden border border-gray-100 shadow-lg">
            <img src={property.images[0]} className="w-full h-full object-cover" alt={property.title} />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {property.images.slice(1).map((img, i) => (
              <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-gray-100">
                <img src={img} className="w-full h-full object-cover" alt="" />
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold mb-2">
              {property.category} • {property.sub_category}
              {property.verified && <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1"><CheckCircle size={10} /> Verified Owner</span>}
            </div>
            <h1 className="text-4xl font-black mb-4">{property.title}</h1>
            <div className="flex items-center gap-4">
              <p className="text-gray-500 font-medium flex items-center gap-2"><MapPin size={18} /> {property.address}</p>
              {property.owner_verified && (
                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-emerald-100">
                  <CheckCircle size={14} /> Verified Owner
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-8 border-y border-gray-100 py-6">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Rent</p>
              <p className="text-2xl font-black text-primary">₹{property.price.toLocaleString()}<span className="text-sm font-normal text-gray-400">/mo</span></p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Deposit</p>
              <p className="text-2xl font-black text-gray-900">₹{property.deposit.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Size</p>
              <p className="text-2xl font-black text-gray-900">{property.size}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-black mb-4">Amenities</h3>
            <div className="flex flex-wrap gap-3">
              {property.amenities.map(a => (
                <span key={a} className="bg-gray-50 border border-gray-100 px-4 py-2 rounded-xl text-sm font-medium text-gray-600">{a}</span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-black mb-4">Location</h3>
            <div className="h-64 rounded-3xl overflow-hidden border border-gray-100 shadow-sm z-0">
              <MapContainer center={[property.lat || 22.7196, property.lng || 75.8577]} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker position={[property.lat || 22.7196, property.lng || 75.8577]}>
                  <Popup>{property.title}</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => navigate(`/chat/${property.owner_id}?property=${property.id}`)}
              className="flex-1 bg-white border-2 border-primary text-primary py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
            >
              <MessageSquare size={20} /> Chat with Owner
            </button>
            <button 
              onClick={() => setShowBooking(true)}
              className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors"
            >
              <Calendar size={20} /> Book Visit
            </button>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="mt-16">
        <h3 className="text-2xl font-black mb-6">Location</h3>
        <div className="h-[400px] rounded-3xl overflow-hidden border border-gray-100 shadow-inner bg-gray-100 relative">
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-medium">
            <div className="text-center">
              <MapPin size={48} className="mx-auto mb-2 opacity-20" />
              Google Maps Integration
            </div>
          </div>
          {/* Placeholder for real map */}
          <iframe 
            width="100%" 
            height="100%" 
            frameBorder="0" 
            style={{ border: 0 }} 
            src={`https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodeURIComponent(property.address)}`} 
            allowFullScreen
            className="opacity-50 grayscale"
          ></iframe>
        </div>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {showBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowBooking(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-2xl font-black mb-4">Book a Visit</h3>
              <p className="text-gray-500 mb-6">Choose a date to visit the property and meet the owner.</p>
              <input type="date" className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 mb-6 outline-none focus:border-primary font-bold" />
              <button 
                onClick={() => setShowBooking(false)}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold"
              >
                Confirm Booking
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ChatView = () => {
  const { ownerId } = useParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const socket = React.useRef<any>(null);

  useEffect(() => {
    socket.current = io();
    socket.current.emit('join', MOCK_USER.id);

    fetch(`/api/messages/${MOCK_USER.id}/${ownerId}`)
      .then(res => res.json())
      .then(data => setMessages(data));

    socket.current.on('receive_message', (msg: any) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => socket.current.disconnect();
  }, [ownerId]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const msg = {
      sender_id: MOCK_USER.id,
      receiver_id: ownerId,
      content: input,
      timestamp: new Date().toISOString()
    };
    socket.current.emit('send_message', msg);
    setMessages(prev => [...prev, msg]);
    setInput('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 h-[calc(100vh-150px)] flex flex-col">
      <div className="bg-white border border-gray-100 rounded-3xl shadow-xl flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-primary font-bold">O</div>
          <div>
            <h3 className="font-bold">Property Owner</h3>
            <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Online
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.sender_id === MOCK_USER.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-4 rounded-2xl font-medium text-sm shadow-sm ${m.sender_id === MOCK_USER.id ? 'bg-primary text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                {m.content}
                <p className={`text-[8px] mt-1 opacity-60 ${m.sender_id === MOCK_USER.id ? 'text-right' : 'text-left'}`}>
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-white border-t border-gray-50 flex gap-2">
          <input 
            type="text" 
            className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-primary font-medium"
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
          />
          <button 
            onClick={sendMessage}
            className="bg-primary text-white p-3 rounded-xl hover:bg-primary-dark transition-colors"
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

const PremiumPlansView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [showUPIModal, setShowUPIModal] = useState<{ plan: string, amount: number } | null>(null);
  const [transactionId, setTransactionId] = useState('');

  const handleUPIClick = (plan: string, amount: number) => {
    setShowUPIModal({ plan, amount });
  };

  const handleVerifyPayment = async () => {
    if (!transactionId.trim()) return;
    setLoading(showUPIModal?.plan || 'loading');
    
    try {
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: MOCK_USER.id,
          plan: showUPIModal?.plan,
          transactionId
        })
      });
      
      if (verifyRes.ok) {
        navigate('/payment-success');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const upiId = "kirayo@upi"; // Mock UPI ID

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black mb-4">Choose Your Plan</h1>
        <p className="text-gray-500 text-lg font-medium">Upgrade to post unlimited ads and get featured listings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Free Plan */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="mb-8">
            <h3 className="text-xl font-black mb-2">Free</h3>
            <div className="text-4xl font-black">₹0<span className="text-sm font-normal text-gray-400">/mo</span></div>
          </div>
          <ul className="space-y-4 mb-10 flex-1">
            <li className="flex items-center gap-2 text-sm text-gray-600 font-medium">
              <CheckCircle size={16} className="text-emerald-500" /> 3 Free listings per month
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600 font-medium">
              <CheckCircle size={16} className="text-emerald-500" /> Basic search visibility
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-400 font-medium line-through">
              Unlimited postings
            </li>
          </ul>
          <button disabled className="w-full py-4 rounded-xl font-bold bg-gray-100 text-gray-400">Current Plan</button>
        </div>

        {/* Basic Plan */}
        <div className="bg-white p-8 rounded-3xl border-2 border-red-100 shadow-xl flex flex-col relative">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold">POPULAR</div>
          <div className="mb-8">
            <h3 className="text-xl font-black mb-2">Basic</h3>
            <div className="text-4xl font-black">₹99<span className="text-sm font-normal text-gray-400">/mo</span></div>
          </div>
          <ul className="space-y-4 mb-10 flex-1">
            <li className="flex items-center gap-2 text-sm text-gray-600 font-medium">
              <CheckCircle size={16} className="text-emerald-500" /> Unlimited postings
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600 font-medium">
              <CheckCircle size={16} className="text-emerald-500" /> Basic priority in search
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600 font-medium">
              <CheckCircle size={16} className="text-emerald-500" /> 30 Days validity
            </li>
          </ul>
          <button 
            onClick={() => handleUPIClick('basic', 99)}
            className="w-full py-4 rounded-xl font-bold bg-primary text-white hover:bg-primary-dark transition-all"
          >
            Upgrade Now
          </button>
        </div>

        {/* Pro Plan */}
        <div className="bg-gray-900 p-8 rounded-3xl shadow-xl flex flex-col text-white">
          <div className="mb-8">
            <h3 className="text-xl font-black mb-2 text-amber-400 flex items-center gap-2">
              <Crown size={20} /> Pro
            </h3>
            <div className="text-4xl font-black">₹299<span className="text-sm font-normal text-gray-400">/mo</span></div>
          </div>
          <ul className="space-y-4 mb-10 flex-1">
            <li className="flex items-center gap-2 text-sm text-white/80 font-medium">
              <Zap size={16} className="text-amber-400" /> Unlimited + Featured (Top)
            </li>
            <li className="flex items-center gap-2 text-sm text-white/80 font-medium">
              <ShieldCheck size={16} className="text-amber-400" /> Verified Badge Included
            </li>
            <li className="flex items-center gap-2 text-sm text-white/80 font-medium">
              <Star size={16} className="text-amber-400" /> AI Priority in search
            </li>
          </ul>
          <button 
            onClick={() => handleUPIClick('pro', 299)}
            className="w-full py-4 rounded-xl font-bold bg-amber-500 text-gray-900 hover:bg-amber-400 transition-all"
          >
            Go Pro
          </button>
        </div>
      </div>

      {/* UPI Payment Modal */}
      <AnimatePresence>
        {showUPIModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowUPIModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black text-gray-900">Pay via UPI</h3>
                  <p className="text-gray-500 text-sm font-medium">Scan or use UPI ID to pay ₹{showUPIModal.amount}</p>
                </div>
                <button onClick={() => setShowUPIModal(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="bg-gray-50 rounded-3xl p-6 mb-6 flex flex-col items-center border border-gray-100">
                <div className="w-48 h-48 bg-white rounded-2xl border-4 border-white shadow-sm flex items-center justify-center mb-4 overflow-hidden">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=Kirayo&am=${showUPIModal.amount}&cu=INR`)}`} 
                    alt="UPI QR" 
                    className="w-full h-full"
                  />
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
                  <span className="text-sm font-black text-gray-700">{upiId}</span>
                  <button 
                    onClick={() => navigator.clipboard.writeText(upiId)}
                    className="p-1 hover:text-primary transition-colors"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <a 
                  href={`upi://pay?pa=${upiId}&pn=Kirayo&am=${showUPIModal.amount}&cu=INR`}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-100"
                >
                  <Smartphone size={20} /> Open UPI App
                </a>
                
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                  <div className="relative flex justify-center text-xs uppercase font-black text-gray-300 bg-white px-4">After Payment</div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">Transaction ID / UTR</label>
                  <input 
                    type="text" 
                    placeholder="Enter 12-digit UTR number"
                    className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none focus:border-primary font-bold text-sm text-gray-900"
                    value={transactionId}
                    onChange={e => setTransactionId(e.target.value)}
                  />
                </div>

                <button 
                  onClick={handleVerifyPayment}
                  disabled={!transactionId || !!loading}
                  className={`w-full py-4 rounded-2xl font-bold transition-all ${transactionId ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                  {loading ? 'Verifying...' : 'Confirm & Activate'}
                </button>
              </div>

              <div className="mt-6 flex items-center justify-center gap-4 opacity-30 grayscale">
                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo.png" className="h-4" alt="UPI" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.png/1200px-Paytm_Logo_%28standalone%29.png" className="h-3" alt="Paytm" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/PhonePe_Logo.svg/1200px-PhonePe_Logo.svg.png" className="h-3" alt="PhonePe" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mt-20 flex flex-col items-center">
        <div className="flex items-center gap-6 mb-8 opacity-60 grayscale hover:grayscale-0 transition-all">
          <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo.png" className="h-6" alt="UPI" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.png/1200px-Paytm_Logo_%28standalone%29.png" className="h-5" alt="Paytm" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/PhonePe_Logo.svg/1200px-PhonePe_Logo.svg.png" className="h-5" alt="PhonePe" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Google_Pay_Logo.svg/1200px-Google_Pay_Logo.svg.png" className="h-5" alt="GPay" />
        </div>
        <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border border-emerald-100">
          <ShieldCheck size={16} /> Direct UPI Payment • Secure & Instant
        </div>
      </div>
    </div>
  );
};

const PaymentSuccessView = () => {
  const navigate = useNavigate();
  return (
    <div className="max-w-xl mx-auto px-4 py-32 text-center">
      <motion.div 
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 text-emerald-600"
      >
        <Check size={48} strokeWidth={3} />
      </motion.div>
      <h1 className="text-4xl font-black mb-4">Payment Successful!</h1>
      <p className="text-gray-500 text-lg mb-10">Your Premium plan has been activated. You can now post unlimited listings and enjoy all premium features.</p>
      <button 
        onClick={() => navigate('/dashboard')}
        className="bg-primary text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-red-100 hover:bg-primary-dark transition-all"
      >
        Go to Dashboard
      </button>
    </div>
  );
};

const DashboardView = () => {
  const [user, setUser] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${MOCK_USER.id}`)
      .then(res => res.json())
      .then(data => setUser(data));
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const result = await verifyDocument(base64, file.type);
        setVerificationResult(result);
        if (result.isVerified) {
          await fetch('/api/users/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: MOCK_USER.id, verified: true })
          });
          setUser((prev: any) => ({ ...prev, verified: 1 }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img src={MOCK_USER.avatar} alt="Avatar" className="w-20 h-20 rounded-3xl border-4 border-white shadow-xl" />
            {user?.verified === 1 && (
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white">
                <CheckCircle size={12} />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black">Welcome, {MOCK_USER.name}</h1>
              {user?.verified === 1 && (
                <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-100">Verified</span>
              )}
              {user?.plan !== 'free' && (
                <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-100 flex items-center gap-1">
                  <Crown size={10} /> {user?.plan.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-gray-500 font-medium">Manage your rentals and bookings</p>
          </div>
        </div>

        <div className="flex gap-4">
          {user?.plan === 'free' && (
            <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 flex flex-col justify-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Free Ads Left</span>
              <span className="text-xl font-black text-primary">{Math.max(0, 3 - (user?.listings_this_month || 0))}/3</span>
            </div>
          )}
          {user?.verified !== 1 && (
            <button 
              onClick={() => setVerifying(true)}
              className="bg-white border-2 border-gray-100 text-gray-700 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:border-primary transition-all"
            >
              <CheckCircle size={18} /> Verify Identity
            </button>
          )}
          <Link 
            to="/premium"
            className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-red-100"
          >
            <Crown size={18} /> Upgrade Plan
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Verification Modal */}
        <AnimatePresence>
          {verifying && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setVerifying(false)}
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-primary/10">
                  {loading && <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1/2 h-full bg-primary" />}
                </div>
                
                <h3 className="text-2xl font-black mb-4">Owner Verification</h3>
                <p className="text-gray-500 mb-6 text-sm">Upload your ID card or Property Deed. Kirayo AI will analyze it to verify your ownership.</p>
                
                {!verificationResult ? (
                  <div className="space-y-4">
                    <label className="block border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-primary transition-colors">
                      <input type="file" className="hidden" onChange={handleFileUpload} disabled={loading} accept="image/*" />
                      <div className="bg-red-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                        <Plus size={24} />
                      </div>
                      <span className="text-sm font-bold text-gray-700">{loading ? 'Analyzing with AI...' : 'Select Document Image'}</span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className={`p-6 rounded-2xl border ${verificationResult.isVerified ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {verificationResult.isVerified ? <CheckCircle className="text-emerald-500" /> : <X className="text-red-500" />}
                        <span className={`font-bold ${verificationResult.isVerified ? 'text-emerald-700' : 'text-red-700'}`}>
                          {verificationResult.isVerified ? 'Verification Successful!' : 'Verification Failed'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-4">{verificationResult.reason}</p>
                      <div className="grid grid-cols-2 gap-4 text-[10px] font-bold uppercase text-gray-400">
                        <div>
                          <p>Type</p>
                          <p className="text-gray-900">{verificationResult.documentType}</p>
                        </div>
                        <div>
                          <p>Confidence</p>
                          <p className="text-gray-900">{Math.round(verificationResult.confidence * 100)}%</p>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setVerifying(false); setVerificationResult(null); }}
                      className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold"
                    >
                      Close
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="text-primary bg-red-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
            <MessageSquare size={24} />
          </div>
          <h3 className="text-xl font-black mb-2">Messages</h3>
          <p className="text-gray-500 text-sm mb-6">You have 3 new messages from owners.</p>
          <button className="text-primary font-bold flex items-center gap-1">Open Chat <ArrowRight size={16} /></button>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="text-emerald-600 bg-emerald-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
            <Calendar size={24} />
          </div>
          <h3 className="text-xl font-black mb-2">Bookings</h3>
          <p className="text-gray-500 text-sm mb-6">1 upcoming visit scheduled for tomorrow.</p>
          <button className="text-emerald-600 font-bold flex items-center gap-1">View Schedule <ArrowRight size={16} /></button>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="text-blue-600 bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
            <Star size={24} />
          </div>
          <h3 className="text-xl font-black mb-2">Reviews</h3>
          <p className="text-gray-500 text-sm mb-6">You haven't posted any reviews yet.</p>
          <button className="text-blue-600 font-bold flex items-center gap-1">Write Review <ArrowRight size={16} /></button>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/search" element={<SearchView />} />
            <Route path="/post" element={<PostPropertyView />} />
            <Route path="/property/:id" element={<PropertyDetailView />} />
            <Route path="/chat/:ownerId" element={<ChatView />} />
            <Route path="/premium" element={<PremiumPlansView />} />
            <Route path="/payment-success" element={<PaymentSuccessView />} />
            <Route path="/dashboard" element={<DashboardView />} />
          </Routes>
        </main>
        
        {/* Footer */}
        <footer className="bg-gray-50 border-t border-gray-100 py-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <span className="text-2xl font-black text-primary tracking-tighter mb-4 block">Kirayo</span>
            <p className="text-gray-400 text-sm">© 2026 Kirayo Rentals India. All rights reserved.</p>
            <p className="text-gray-400 text-[10px] mt-2">Made with ❤️ for Bharat</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}
