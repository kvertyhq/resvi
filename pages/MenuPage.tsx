import React, { useEffect, useMemo, useState } from 'react';
import { useOrder, MenuItemData } from '../context/OrderContext';
import OrderSummary from '../components/OrderSummary';
import { useSettings } from "../context/SettingsContext";

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

const MenuItem: React.FC<{ item: MenuItemData }> = ({ item }) => {
  const { addToCart } = useOrder();
  const { settings } = useSettings();
  return (
    <div className="flex justify-between items-center py-4 border-b border-gray-200">
      <div className="flex-1">
        <h4 className="font-bold text-lg text-brand-dark-gray">{item.name}</h4>
        {item.description && <p className="text-sm text-brand-mid-gray mt-1">{item.description}</p>}
        <div className="mt-2 flex items-center space-x-2">
          {item.tags?.map(tag => (
            <span key={tag} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="text-right ml-4 flex-shrink-0">
        <p className="font-bold text-brand-dark-gray">{settings?.currency}{(item.price ?? 0).toFixed(2)}</p>
        <button
          onClick={() => addToCart(item)}
          className="mt-2 text-sm text-brand-gold font-semibold hover:underline"
          disabled={(item as any).is_available === false}
        >
          {(item as any).is_available === false ? 'Unavailable' : 'Add to cart'}
        </button>
      </div>
    </div>
  );
};

const MenuPage: React.FC = () => {
  const { addToCart } = useOrder();

  const [groupedMenu, setGroupedMenu] = useState<Record<string, MenuItemData[]>>({});
  const [categoryMeta, setCategoryMeta] = useState<
    { id: string; name: string; description?: string; order_index?: number }[]
  >([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useSettings();

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
          body: JSON.stringify({ available_only: true }), // adjust if your RPC expects a different body
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

  const featuredItem = useMemo(() => filteredItems[0], [filteredItems]);

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

                {/* Featured Item */}
                {featuredItem && (
                  <div className="mb-12 border-b border-gray-200 pb-8">
                    <p className="text-brand-gold font-semibold text-sm">Chef's Special</p>
                    <h2 className="text-4xl font-serif text-brand-dark font-bold mt-2">{featuredItem.name}</h2>
                    <p className="text-brand-mid-gray mt-3 max-w-xl">{featuredItem.description}</p>
                    <div className="flex items-center space-x-4 mt-4">
                      <p className="text-2xl font-bold text-brand-dark">{settings?.currency}{(featuredItem.price ?? 0).toFixed(2)}</p>
                      {featuredItem.tags?.map(tag => (
                        <span key={tag} className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => addToCart(featuredItem)}
                      className="mt-6 bg-brand-gold text-white px-8 py-3 font-semibold tracking-wider hover:opacity-90 transition-opacity"
                      disabled={(featuredItem as any).is_available === false}
                    >
                      {(featuredItem as any).is_available === false ? 'Unavailable' : 'Add to cart'}
                    </button>
                  </div>
                )}

                {/* Menu List */}
                <div>
                  <h3 className="text-3xl font-serif font-bold text-brand-dark">{activeCategory || 'Menu'}</h3>
                  <div className="mt-4">
                    {filteredItems.length > 0 ? (
                      filteredItems.map(item => <MenuItem key={item.id} item={item} />)
                    ) : (
                      <p className="text-brand-mid-gray py-8">No items found in this category.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right side - Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuPage;
