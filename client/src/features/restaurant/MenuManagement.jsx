import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, ImageIcon, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  useGetMyRestaurantQuery,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
  useDeleteMenuItemMutation,
} from './restaurantApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../utils/formatCurrency';

// Schemas
const catSchema = z.object({ name: z.string().min(1, 'Category name required') });
const itemSchema = z.object({
  name: z.string().min(1, 'Item name required'),
  description: z.string().optional(),
  price: z.coerce.number().min(1, 'Price must be at least ৳1'),
  isAvailable: z.boolean(),
});

function CategoryModal({ isOpen, onClose, initial, restaurantId }) {
  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(catSchema),
    defaultValues: { name: initial?.name || '' },
  });

  const onSubmit = async (data) => {
    try {
      if (initial) {
        await updateCategory({ restaurantId, catId: initial._id, name: data.name }).unwrap();
        toast.success('Category updated');
      } else {
        await createCategory({ restaurantId, name: data.name }).unwrap();
        toast.success('Category created');
      }
      reset();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save category');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { reset(); onClose(); }}
      title={initial ? 'Edit Category' : 'Add Category'}
      footer={
        <>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isCreating || isUpdating}>Save</Button>
        </>
      }
    >
      <Input label="Category Name" placeholder="e.g. Starters, Main Course..." error={errors.name?.message} {...register('name')} />
    </Modal>
  );
}

function ItemModal({ isOpen, onClose, initial, restaurantId, catId }) {
  const [createMenuItem, { isLoading: isCreating }] = useCreateMenuItemMutation();
  const [updateMenuItem, { isLoading: isUpdating }] = useUpdateMenuItemMutation();
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(initial?.photo?.url || null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: initial?.name || '',
      description: initial?.description || '',
      price: initial?.price || '',
      isAvailable: initial?.isAvailable ?? true,
    },
  });

  const onSubmit = async (data) => {
    const fd = new FormData();
    fd.append('name', data.name);
    if (data.description) fd.append('description', data.description);
    fd.append('price', data.price);
    fd.append('isAvailable', data.isAvailable);
    if (photoFile) fd.append('photo', photoFile);

    try {
      if (initial) {
        await updateMenuItem({ restaurantId, catId, itemId: initial._id, formData: fd }).unwrap();
        toast.success('Item updated');
      } else {
        await createMenuItem({ restaurantId, catId, formData: fd }).unwrap();
        toast.success('Item added');
      }
      setPhotoFile(null);
      setPhotoPreview(null);
      reset();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save item');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { reset(); setPhotoFile(null); setPhotoPreview(null); onClose(); }}
      title={initial ? 'Edit Item' : 'Add Menu Item'}
      footer={
        <>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isCreating || isUpdating}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Photo upload */}
        <div>
          <label className="text-sm font-medium text-[#1C1C1C] block mb-2">Item Photo</label>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded border border-[#E0E0E0] overflow-hidden bg-[#F9F9F9] flex items-center justify-center shrink-0">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={24} className="text-[#E0E0E0]" />
              )}
            </div>
            <label className="cursor-pointer mt-1">
              <div className="border-2 border-dashed border-[#E0E0E0] rounded-[8px] px-4 py-2.5 text-sm text-[#7E808C] hover:border-[#E23744] transition-colors">
                {photoFile ? photoFile.name : 'Upload photo'}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }
                }}
              />
            </label>
          </div>
        </div>

        <Input label="Item Name" error={errors.name?.message} {...register('name')} />

        <div>
          <label className="text-sm font-medium text-[#1C1C1C] block mb-1">Description</label>
          <textarea
            {...register('description')}
            rows={2}
            placeholder="Brief description (optional)"
            className="w-full border border-[#E0E0E0] rounded-[6px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#E23744] resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#1C1C1C] block mb-1">Price</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#7E808C]">৳</span>
            <input
              type="number"
              min={1}
              step="0.01"
              {...register('price')}
              className="w-full pl-7 border border-[#E0E0E0] rounded-[6px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#E23744]"
            />
          </div>
          {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('isAvailable')} className="accent-[#E23744]" />
          <span className="text-sm text-[#1C1C1C]">Available for ordering</span>
        </label>
      </div>
    </Modal>
  );
}

function DeleteModal({ isOpen, onClose, onConfirm, loading, label }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Delete"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>Delete</Button>
        </>
      }
    >
      <p className="text-sm text-[#7E808C]">{label}</p>
    </Modal>
  );
}

export default function MenuManagement() {
  const { data: restData, isLoading: restLoading } = useGetMyRestaurantQuery();
  const restaurant = restData?.restaurant;
  const restaurantId = restaurant?._id;

  const { data: catData, isLoading: catLoading } = useGetCategoriesQuery(restaurantId, { skip: !restaurantId });
  const [deleteCategory, { isLoading: isDeletingCat }] = useDeleteCategoryMutation();
  const [updateMenuItem] = useUpdateMenuItemMutation();
  const [deleteMenuItem, { isLoading: isDeletingItem }] = useDeleteMenuItemMutation();

  const categories = catData?.categories || [];

  const [selectedCatId, setSelectedCatId] = useState(null);
  const selectedCat = categories.find((c) => c._id === (selectedCatId || categories[0]?._id));

  const [catModal, setCatModal] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [itemModal, setItemModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteCatModal, setDeleteCatModal] = useState(null);
  const [deleteItemModal, setDeleteItemModal] = useState(null);

  const handleDeleteCat = async () => {
    try {
      await deleteCategory({ restaurantId, catId: deleteCatModal._id }).unwrap();
      toast.success('Category deleted');
      setDeleteCatModal(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete category');
    }
  };

  const handleDeleteItem = async () => {
    try {
      await deleteMenuItem({ restaurantId, catId: selectedCat._id, itemId: deleteItemModal._id }).unwrap();
      toast.success('Item deleted');
      setDeleteItemModal(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete item');
    }
  };

  const handleToggleAvailability = async (item) => {
    const fd = new FormData();
    fd.append('isAvailable', !item.isAvailable);
    try {
      await updateMenuItem({ restaurantId, catId: selectedCat._id, itemId: item._id, formData: fd }).unwrap();
    } catch (err) {
      toast.error('Failed to update availability');
    }
  };

  if (restLoading || catLoading) {
    return (
      <DashboardLayout title="Menu Management">
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      </DashboardLayout>
    );
  }

  const items = selectedCat?.items || [];

  return (
    <DashboardLayout title="Menu Management">
      {/* Mobile: category tabs */}
      <div className="md:hidden mb-4 bg-white rounded-[8px] border border-[#E0E0E0] overflow-x-auto flex">
        {categories.map((cat) => (
          <button
            key={cat._id}
            onClick={() => setSelectedCatId(cat._id)}
            className={`shrink-0 px-4 py-3 text-sm border-b-2 transition-colors ${
              (selectedCatId || categories[0]?._id) === cat._id
                ? 'border-[#E23744] text-[#E23744] font-medium'
                : 'border-transparent text-[#7E808C]'
            }`}
          >
            {cat.name}
          </button>
        ))}
        <button
          onClick={() => { setEditCat(null); setCatModal(true); }}
          className="shrink-0 px-4 py-3 text-sm text-[#E23744] border-b-2 border-transparent flex items-center gap-1"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      <div className="flex gap-5 min-h-[500px]">
        {/* Desktop: sidebar categories */}
        <aside className="hidden md:flex flex-col w-52 shrink-0 bg-white rounded-[8px] border border-[#E0E0E0] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E0E0E0] flex items-center justify-between">
            <span className="text-sm font-semibold text-[#1C1C1C]">Categories</span>
            <button
              onClick={() => { setEditCat(null); setCatModal(true); }}
              className="text-[#E23744] hover:bg-[#fff0f1] rounded p-0.5"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {categories.length === 0 && (
              <p className="text-xs text-[#7E808C] px-4 py-4">No categories yet</p>
            )}
            {categories.map((cat) => (
              <div
                key={cat._id}
                className={`flex items-center justify-between px-4 py-3 border-b border-[#E0E0E0] cursor-pointer group ${
                  (selectedCatId || categories[0]?._id) === cat._id
                    ? 'bg-[#fff0f1] border-r-2 border-r-[#E23744]'
                    : 'hover:bg-[#F9F9F9]'
                }`}
                onClick={() => setSelectedCatId(cat._id)}
              >
                <span className={`text-sm truncate ${(selectedCatId || categories[0]?._id) === cat._id ? 'text-[#E23744] font-medium' : 'text-[#1C1C1C]'}`}>
                  {cat.name}
                </span>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditCat(cat); setCatModal(true); }}
                    className="p-1 text-[#7E808C] hover:text-[#1C1C1C]"
                  >
                    <Pencil size={12} />
                  </button>
                  {(!cat.items || cat.items.length === 0) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteCatModal(cat); }}
                      className="p-1 text-[#7E808C] hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Items panel */}
        <div className="flex-1 min-w-0 bg-white rounded-[8px] border border-[#E0E0E0] flex flex-col">
          {!selectedCat ? (
            <div className="flex-1 flex items-center justify-center text-sm text-[#7E808C]">
              {categories.length === 0 ? 'Create a category first to add items.' : 'Select a category to view items.'}
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-[#E0E0E0] flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[#1C1C1C]">{selectedCat.name}</h3>
                  <p className="text-xs text-[#7E808C]">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                </div>
                <Button size="sm" onClick={() => { setEditItem(null); setItemModal(true); }}>
                  <Plus size={14} /> Add Item
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#7E808C]">
                  <p className="text-sm">No items in this category</p>
                  <Button size="sm" variant="outline" onClick={() => { setEditItem(null); setItemModal(true); }}>
                    <Plus size={14} /> Add First Item
                  </Button>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item._id} className="border border-[#E0E0E0] rounded-[8px] overflow-hidden bg-white hover:shadow-sm transition-shadow">
                      {/* Image */}
                      <div className="h-28 bg-[#F9F9F9] flex items-center justify-center overflow-hidden">
                        {item.photo?.url ? (
                          <img src={item.photo.url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={32} className="text-[#E0E0E0]" />
                        )}
                      </div>
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-sm font-medium text-[#1C1C1C] truncate">{item.name}</h4>
                            {item.description && (
                              <p className="text-xs text-[#7E808C] mt-0.5 line-clamp-2">{item.description}</p>
                            )}
                            <p className="text-sm font-semibold text-[#1C1C1C] mt-1">{formatCurrency(item.price)}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          {/* Availability toggle */}
                          <button
                            onClick={() => handleToggleAvailability(item)}
                            className="flex items-center gap-1.5 text-xs"
                          >
                            {item.isAvailable ? (
                              <ToggleRight size={18} className="text-[#60B246]" />
                            ) : (
                              <ToggleLeft size={18} className="text-[#7E808C]" />
                            )}
                            <span className={item.isAvailable ? 'text-[#60B246]' : 'text-[#7E808C]'}>
                              {item.isAvailable ? 'Available' : 'Unavailable'}
                            </span>
                          </button>
                          {/* Actions */}
                          <div className="flex gap-1">
                            <button
                              onClick={() => { setEditItem(item); setItemModal(true); }}
                              className="p-1.5 text-[#7E808C] hover:text-[#1C1C1C] hover:bg-[#F1F1F6] rounded"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteItemModal(item)}
                              className="p-1.5 text-[#7E808C] hover:text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <CategoryModal
        isOpen={catModal}
        onClose={() => { setCatModal(false); setEditCat(null); }}
        initial={editCat}
        restaurantId={restaurantId}
      />
      {selectedCat && (
        <ItemModal
          isOpen={itemModal}
          onClose={() => { setItemModal(false); setEditItem(null); }}
          initial={editItem}
          restaurantId={restaurantId}
          catId={selectedCat._id}
        />
      )}
      <DeleteModal
        isOpen={!!deleteCatModal}
        onClose={() => setDeleteCatModal(null)}
        onConfirm={handleDeleteCat}
        loading={isDeletingCat}
        label="Delete this category? Only empty categories can be deleted."
      />
      <DeleteModal
        isOpen={!!deleteItemModal}
        onClose={() => setDeleteItemModal(null)}
        onConfirm={handleDeleteItem}
        loading={isDeletingItem}
        label="This will remove the item from your menu permanently."
      />
    </DashboardLayout>
  );
}
