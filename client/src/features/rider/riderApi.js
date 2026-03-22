import { apiSlice } from '../../app/api';

export const riderApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyRider: builder.query({
      query: () => '/riders/me',
      transformResponse: (res) => ({ rider: res.data?.rider || null }),
      providesTags: ['Rider'],
    }),
    submitRiderApplication: builder.mutation({
      query: (formData) => ({
        url: '/riders/apply',
        method: 'POST',
        body: formData,
        formData: true,
      }),
      invalidatesTags: ['Rider'],
    }),
    toggleRiderAvailability: builder.mutation({
      query: () => ({
        url: '/riders/toggle-availability',
        method: 'PATCH',
      }),
      invalidatesTags: ['Rider', 'Order'],
    }),
    getActiveDelivery: builder.query({
      query: () => '/riders/active-delivery',
      transformResponse: (res) => ({ order: res.data?.order || null }),
      providesTags: ['Order'],
    }),
    updateDeliveryStatus: builder.mutation({
      query: ({ orderId, status }) => ({
        url: `/orders/${orderId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Order', 'Rider'],
    }),
    getDeliveryHistory: builder.query({
      query: (params = {}) => ({ url: '/riders/delivery-history', params }),
      transformResponse: (res) => {
        const pagination = res.pagination || res.data?.pagination || {};
        return { deliveries: res.data?.orders || [], pages: pagination.pages || 1, total: pagination.total || 0 };
      },
      providesTags: ['RiderEarning'],
    }),
    getRiderEarnings: builder.query({
      query: (params = {}) => ({ url: '/riders/earnings', params }),
      transformResponse: (res) => res.data || res,
      providesTags: ['RiderEarning'],
    }),
  }),
});

export const {
  useGetMyRiderQuery,
  useSubmitRiderApplicationMutation,
  useToggleRiderAvailabilityMutation,
  useGetActiveDeliveryQuery,
  useUpdateDeliveryStatusMutation,
  useGetDeliveryHistoryQuery,
  useGetRiderEarningsQuery,
} = riderApi;
