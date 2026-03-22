import { apiSlice } from '../../app/api';

export const customerApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Restaurants
    getRestaurants: builder.query({
      query: (params = {}) => ({ url: '/restaurants', params }),
      transformResponse: (res) => ({ restaurants: res.results || [], totalPages: res.totalPages, currentPage: res.currentPage, totalResults: res.totalResults }),
      providesTags: ['Restaurant'],
    }),
    getRestaurantById: builder.query({
      query: ({ id, lat, lng }) => ({
        url: `/restaurants/${id}`,
        params: lat && lng ? { lat, lng } : {},
      }),
      transformResponse: (res) => ({ restaurant: res.data }),
      providesTags: (r, e, { id }) => [{ type: 'Restaurant', id }],
    }),
    getRestaurantReviews: builder.query({
      query: ({ id, page = 1, limit = 10, sort = 'recent' }) => ({
        url: `/restaurants/${id}/reviews`,
        params: { page, limit, sort },
      }),
      transformResponse: (res) => ({ reviews: res.data?.reviews || [], pagination: res.pagination }),
      providesTags: (r, e, { id }) => [{ type: 'Review', id }],
    }),

    // Cart
    getCart: builder.query({
      query: () => '/cart',
      transformResponse: (res) => ({ cart: res.data }),
      providesTags: ['Cart'],
    }),
    addToCart: builder.mutation({
      query: (data) => ({ url: '/cart/items', method: 'POST', body: data }),
      invalidatesTags: ['Cart'],
    }),
    updateCartItem: builder.mutation({
      query: ({ menuItemId, quantity, specialInstructions }) => ({
        url: `/cart/items/${menuItemId}`,
        method: 'PATCH',
        body: { quantity, specialInstructions },
      }),
      invalidatesTags: ['Cart'],
    }),
    removeCartItem: builder.mutation({
      query: (menuItemId) => ({
        url: `/cart/items/${menuItemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),
    clearCart: builder.mutation({
      query: () => ({ url: '/cart', method: 'DELETE' }),
      invalidatesTags: ['Cart'],
    }),

    // Coupons
    applyCoupon: builder.mutation({
      query: (data) => ({ url: '/coupons/apply', method: 'POST', body: data }),
    }),

    // Orders
    placeOrder: builder.mutation({
      query: (data) => ({ url: '/orders', method: 'POST', body: data }),
      invalidatesTags: ['Cart', 'Order'],
    }),
    getOrders: builder.query({
      query: (params = {}) => ({ url: '/orders', params }),
      transformResponse: (res) => ({ orders: res.results || [], pages: res.totalPages || 1, total: res.totalResults || 0 }),
      providesTags: ['Order'],
    }),
    getOrderById: builder.query({
      query: (id) => `/orders/${id}`,
      transformResponse: (res) => ({ order: res.data }),
      providesTags: (r, e, id) => [{ type: 'Order', id }],
    }),
    cancelOrder: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/orders/${id}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Order'],
    }),

    // Messages
    getMessages: builder.query({
      query: (orderId) => `/orders/${orderId}/messages`,
      providesTags: (r, e, orderId) => [{ type: 'Message', id: orderId }],
    }),
    sendMessage: builder.mutation({
      query: ({ orderId, text }) => ({
        url: `/orders/${orderId}/messages`,
        method: 'POST',
        body: { text },
      }),
      invalidatesTags: (r, e, { orderId }) => [{ type: 'Message', id: orderId }],
    }),

    // Reviews
    createReview: builder.mutation({
      query: ({ orderId, formData }) => ({
        url: `/orders/${orderId}/reviews`,
        method: 'POST',
        body: formData,
        formData: true,
      }),
      invalidatesTags: ['Order', 'Review'],
    }),

    // Complaints
    fileComplaint: builder.mutation({
      query: (data) => ({ url: '/complaints', method: 'POST', body: data }),
    }),

    // Profile
    getMyProfile: builder.query({
      query: () => '/users/profile',
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation({
      query: (formData) => ({
        url: '/users/profile',
        method: 'PATCH',
        body: formData,
        formData: true,
      }),
      invalidatesTags: ['User'],
    }),
    getMyReviews: builder.query({
      query: (params = {}) => ({ url: '/users/reviews', params }),
      providesTags: ['Review'],
    }),
    getMyComplaints: builder.query({
      query: (params = {}) => ({ url: '/complaints/me', params }),
    }),
    addAddress: builder.mutation({
      query: (data) => ({ url: '/users/addresses', method: 'POST', body: data }),
      invalidatesTags: ['User'],
    }),
    updateAddress: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/users/addresses/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    deleteAddress: builder.mutation({
      query: (id) => ({ url: `/users/addresses/${id}`, method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetRestaurantsQuery,
  useGetRestaurantByIdQuery,
  useGetRestaurantReviewsQuery,
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
  useApplyCouponMutation,
  usePlaceOrderMutation,
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useCancelOrderMutation,
  useGetMessagesQuery,
  useSendMessageMutation,
  useCreateReviewMutation,
  useFileComplaintMutation,
  useGetMyProfileQuery,
  useUpdateProfileMutation,
  useGetMyReviewsQuery,
  useGetMyComplaintsQuery,
  useAddAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
} = customerApi;
