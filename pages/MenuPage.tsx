import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrder, MenuItemData, Addon } from '../context/OrderContext';
import OrderSummary from '../components/OrderSummary';
import { useSettings } from "../context/SettingsContext";
import { supabase } from '../supabaseClient';
import CustomerModifierModal from '../components/menu/CustomerModifierModal';

/**
 * Updated to handle Supabase RPC response of the form:
 * [
 *   {
 *     id,
 *     name,
 *     menu_items: [ { id, name, tags, price, image_url, vegetarian, description, spicy_level, is_available }, ... ],
 *     description,
 *     order_index
 *   },
 *   ...
 * ]
 *
 * Uses fixed RPC URL and reads the key from process.env.SUPABASE_KEY
 */

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL + '/rest/v1/rpc/get_full_menu_grouped_by_category';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface MenuPageProps { }

const MenuItem: React.FC<{ item: MenuItemData; onAdd: (item: MenuItemData) => void }> = ({ item, onAdd }) => {
  const { settings } = useSettings();
  return (
    <div className="flex justify-between items-start py-6 border-b border-gray-200">
      {item.image_url && (
        <div className="flex-shrink-0 mr-4">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-24 h-24 object-cover rounded-lg shadow-sm"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-lg text-brand-dark-gray">{item.name}</h4>
            {item.description && <p className="text-sm text-brand-mid-gray mt-1 line-clamp-2">{item.description}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {item.tags?.map(tag => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right ml-4 flex-shrink-0">
            <p className="font-bold text-brand-dark-gray text-lg">{settings?.currency}{(item.price ?? 0).toFixed(2)}</p>
            <button
              onClick={() => onAdd(item)}
              className="mt-3 px-4 py-2 bg-brand-gold text-white text-sm font-semibold rounded-md hover:bg-brand-dark-gray transition-colors w-full"
              disabled={(item as any).is_available === false}
            >
              {(item as any).is_available === false ? 'Unavailable' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MenuPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart, orderType, deliveryDate, deliveryTime, collectionDate, collectionTime } = useOrder();

  const [groupedMenu, setGroupedMenu] = useState<Record<string, MenuItemData[]>>({});
  const [categoryMeta, setCategoryMeta] = useState<
    { id: string; name: string; description?: string; order_index?: number }[]
  >([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useSettings();

  const [selectedItem, setSelectedItem] = useState<MenuItemData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modifierLinks, setModifierLinks] = useState<Record<string, boolean>>({});

  // Fetch Modifier Links to know which items open the modal
  useEffect(() => {
    const fetchModifierLinks = async () => {
      const { data } = await supabase.from('menu_item_modifiers').select('menu_item_id');
      if (data) {
        const links: Record<string, boolean> = {};
        data.forEach(d => { links[d.menu_item_id] = true; });
        setModifierLinks(links);
      }
    };
    fetchModifierLinks();
  }, []);

  // Enforce order flow - redirect if prerequisites not met
  useEffect(() => {
    if (!orderType) {
      navigate('/order');
      return;
    }

    if (orderType === 'delivery' && (!deliveryDate || !deliveryTime)) {
      navigate('/order');
      return;
    }

    if (orderType === 'collection' && (!collectionDate || !collectionTime)) {
      navigate('/order');
      return;
    }
  }, [orderType, deliveryDate, deliveryTime, collectionDate, collectionTime, navigate]);

  const handleAddItem = (item: MenuItemData) => {
    const hasVariants = (item as any).price_variants && (item as any).price_variants.length > 0;
    const hasModifiers = modifierLinks[item.id];

    if (hasVariants || hasModifiers) {
      setSelectedItem(item);
      setIsModalOpen(true);
    } else {
      addToCart(item);
    }
  };

  const handleModalAddToCart = (item: any, selectedModifiers: any[], totalPrice: number) => {
    // We pass empty addons array, and the new modifiers/variant through the item or as additional args.
    // OrderContext will be updated to handle these.
    addToCart(item, [], selectedModifiers);
  };

  useEffect(() => {
    let mounted = true;

    async function fetchMenu() {
      setLoading(true);
      setError(null);

      if (!SUPABASE_KEY) {
        setError('Supabase key not found. Make sure VITE_SUPABASE_ANON_KEY is set.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(SUPABASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            p_restaurant_id: import.meta.env.VITE_RESTAURANT_ID,
            p_available_only: true
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Supabase RPC failed: ${res.status} ${res.statusText} - ${text}`);
        }

        const data = (await res.json()) as any[];

        // Normalize into groupedMenu keyed by category name
        const grouped: Record<string, MenuItemData[]> = {};
        const meta: { id: string; name: string; description?: string; order_index?: number }[] = [];

        if (Array.isArray(data)) {
          // sort categories by order_index ascending (if present)
          data.sort((a, b) => {
            const ai = typeof a.order_index === 'number' ? a.order_index : 0;
            const bi = typeof b.order_index === 'number' ? b.order_index : 0;
            return ai - bi;
          });

          for (const catObj of data) {
            const catName = String(catObj.name ?? 'Uncategorized');
            meta.push({
              id: String(catObj.id ?? ''),
              name: catName,
              description: catObj.description ?? undefined,
              order_index: typeof catObj.order_index === 'number' ? catObj.order_index : undefined,
            });

            const items = Array.isArray(catObj.menu_items) ? catObj.menu_items : [];

            grouped[catName] = items.map((mi: any) => {
              // Map fields to MenuItemData shape; keep extra fields attached if needed
              const mapped: MenuItemData & { [k: string]: any } = {
                id: mi.id,
                name: mi.name,
                description: mi.description ?? '',
                price: typeof mi.price === 'number' ? mi.price : Number(mi.price ?? 0),
                category: catName,
                tags: Array.isArray(mi.tags) ? mi.tags : mi.tags ? [String(mi.tags)] : undefined,
                // extra fields appended so UI can use them (image_url, vegetarian, spicy_level, is_available)
                image_url: mi.image_url,
                vegetarian: mi.vegetarian,
                spicy_level: mi.spicy_level,
                is_available: typeof mi.is_available === 'boolean' ? mi.is_available : true,
                price_variants: mi.price_variants,
              };
              return mapped;
            });
          }
        }

        if (mounted) {
          setGroupedMenu(grouped);
          setCategoryMeta(meta);
          const firstCategory = meta[0]?.name ?? '';
          setActiveCategory(prev => (prev ? prev : firstCategory));
        }
      } catch (err: any) {
        console.error('Error fetching menu:', err);
        if (mounted) setError(err.message ?? 'Unknown error fetching menu');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchMenu();

    return () => {
      mounted = false;
    };
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => categoryMeta.map(c => c.name), [categoryMeta]);
  const filteredItems = useMemo(() => (activeCategory ? groupedMenu[activeCategory] ?? [] : []), [
    activeCategory,
    groupedMenu,
  ]);

  return (
    <div className="bg-white font-sans">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-sm text-gray-500 mb-8">Freshly prepared - Delivery or collection</div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12">
          {/* Left side - Menu */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="py-12 text-center text-brand-mid-gray">Loading menu…</div>
            ) : error ? (
              <div className="py-8 text-center text-red-600">
                <p className="font-semibold">Failed to load menu</p>
                <p className="text-sm mt-2">{error}</p>
              </div>
            ) : (
              <>
                {/* Category Filters */}
                <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4 mb-6">
                  {categories.length > 0 ? (
                    categories.map(category => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${activeCategory === category
                          ? 'bg-brand-dark-gray text-white'
                          : 'bg-gray-100 text-brand-dark-gray hover:bg-gray-200'
                          }`}
                      >
                        {category}
                      </button>
                    ))
                  ) : (
                    <div className="text-sm text-brand-mid-gray px-4 py-2">No categories available</div>
                  )}
                </div>

                {/* Menu List */}
                <div>
                  <h3 className="text-3xl font-serif font-bold text-brand-dark">{activeCategory || 'Menu'}</h3>
                  <div className="mt-4">
                    {filteredItems.length > 0 ? (
                      filteredItems.map(item => <MenuItem key={item.id} item={item} onAdd={handleAddItem} />)
                    ) : (
                      <p className="text-brand-mid-gray py-8">No items found in this category.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div >

          {/* Right side - Order Summary */}
          < div className="lg:col-span-1" >
            <OrderSummary />
          </div >
        </div >
      </div >


      <CustomerModifierModal 
        menuItem={selectedItem} 
        isOpen={isModalOpen && selectedItem !== null} 
        onClose={() => setIsModalOpen(false)} 
        onAddToCart={handleModalAddToCart} 
      />
    </div >
  );
};

export default MenuPage;
