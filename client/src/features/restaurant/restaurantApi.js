import { apiSlice } from '../../app/api';

export const restaurantApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Restaurant profile
    getMyRestaurant: builder.query({
      query: () => '/restaurants/me',
      transformResponse: (res) => ({ restaurant: res.data }),
      providesTags: ['Restaurant'],
    }),
    submitApplication: builder.mutation({
      query: (formData) => ({
        url: '/restaurants',
        method: 'POST',
        body: formData,
        formData: true,
      }),
      invalidatesTags: ['Restaurant'],
    }),
    updateRestaurant: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/restaurants/${id}`,
        method: 'PATCH',
        body: formData,
        formData: true,
      }),
      invalidatesTags: ['Restaurant'],
    }),
    toggleStatus: builder.mutation({
      query: (id) => ({
        url: `/restaurants/${id}/toggle-status`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Restaurant'],
    }),

    // Categories
    getCategories: builder.query({
      query: (restaurantId) => `/restaurants/${restaurantId}/categories`,
      transformResponse: (res) => ({ categories: res.data || res.categories || [] }),
      providesTags: (r, e, restaurantId) => [{ type: 'Category', id: restaurantId }],
    }),
    createCategory: builder.mutation({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/categories`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (r, e, { restaurantId }) => [{ type: 'Category', id: restaurantId }],
    }),
    updateCategory: builder.mutation({
      query: ({ restaurantId, catId, ...body }) => ({
        url: `/restaurants/${restaurantId}/categories/${catId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (r, e, { restaurantId }) => [{ type: 'Category', id: restaurantId }],
    }),
    deleteCategory: builder.mutation({
      query: ({ restaurantId, catId }) => ({
        url: `/restaurants/${restaurantId}/categories/${catId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (r, e, { restaurantId }) => [{ type: 'Category', id: restaurantId }],
    }),

    // Menu items
    getMenuItems: builder.query({
      query: ({ restaurantId, catId }) => `/restaurants/${restaurantId}/categories/${catId}/items`,
      transformResponse: (res) => ({ items: res.data || [] }),
      providesTags: (r, e, { catId }) => [{ type: 'MenuItem', id: catId }],
    }),
    createMenuItem: builder.mutation({
      query: ({ restaurantId, catId, formData }) => ({
        url: `/restaurants/${restaurantId}/categories/${catId}/items`,
        method: 'POST',
        body: formData,
        formData: true,
      }),
      invalidatesTags: (r, e, { catId, restaurantId }) => [
        { type: 'MenuItem', id: catId },
        { type: 'Category', id: restaurantId },
      ],
    }),
    updateMenuItem: builder.mutation({
      query: ({ restaurantId, catId, itemId, formData }) => ({
        url: `/restaurants/${restaurantId}/categories/${catId}/items/${itemId}`,
        method: 'PATCH',
        body: formData,
        formData: true,
      }),
      invalidatesTags: (r, e, { catId, restaurantId }) => [
        { type: 'MenuItem', id: catId },
        { type: 'Category', id: restaurantId },
      ],
    }),
    deleteMenuItem: builder.mutation({
      query: ({ restaurantId, catId, itemId }) => ({
        url: `/restaurants/${restaurantId}/categories/${catId}/items/${itemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (r, e, { catId, restaurantId }) => [
        { type: 'MenuItem', id: catId },
        { type: 'Category', id: restaurantId },
      ],
    }),

    // Orders
    getRestaurantOrders: builder.query({
      query: (params = {}) => ({ url: '/orders', params }),
      transformResponse: (res) => ({ orders: res.results || [], pages: res.totalPages || 1, total: res.totalResults || 0 }),
      providesTags: ['Order'],
    }),
    updateOrderStatus: builder.mutation({
      query: ({ id, status, reason }) => ({
        url: `/orders/${id}/status`,
        method: 'PATCH',
        body: { status, reason },
      }),
      invalidatesTags: ['Order'],
    }),

    // Earnings
    getEarnings: builder.query({
      query: ({ restaurantId, period }) => ({
        url: `/restaurants/${restaurantId}/earnings`,
        params: { period },
      }),
      transformResponse: (res) => res.data || res,
    }),
  }),
});

export const {
  useGetMyRestaurantQuery,
  useSubmitApplicationMutation,
  useUpdateRestaurantMutation,
  useToggleStatusMutation,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetMenuItemsQuery,
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
  useDeleteMenuItemMutation,
  useGetRestaurantOrdersQuery,
  useUpdateOrderStatusMutation,
  useGetEarningsQuery,
} = restaurantApi;
