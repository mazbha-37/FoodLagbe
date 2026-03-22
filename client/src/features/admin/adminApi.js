import { apiSlice } from '../../app/api';

export const adminApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminStats: builder.query({
      query: () => '/admin/dashboard',
      transformResponse: (res) => {
        const d = res.data || {};
        return {
          stats: {
            totalUsers: d.users?.total ?? 0,
            activeRestaurants: d.restaurants?.active ?? 0,
            todayOrders: d.orders?.today ?? 0,
            todayRevenue: d.revenue?.today ?? 0,
            activeRiders: d.riders?.activeNow ?? 0,
            pendingRestaurants: d.restaurants?.pendingApplications ?? 0,
            pendingRiders: d.riders?.pendingApplications ?? 0,
            openComplaints: d.complaints?.pending ?? 0,
            monthlyRevenue: d.revenue?.thisMonth ?? 0,
          },
          ordersByStatus: d.orders?.byStatus || [],
          revenueChart: d.revenue?.last30Days || [],
        };
      },
      providesTags: ['User', 'Restaurant', 'Order'],
    }),

    // Restaurant applications
    getRestaurantApplications: builder.query({
      query: (params = {}) => ({ url: '/admin/restaurants', params }),
      transformResponse: (res) => ({
        restaurants: (res.data?.restaurants || []).map((r) => ({
          ...r,
          status: r.applicationStatus,
        })),
        pagination: res.pagination || res.data?.pagination,
      }),
      providesTags: ['Restaurant'],
    }),
    approveRestaurant: builder.mutation({
      query: (id) => ({ url: `/admin/restaurants/${id}/approve`, method: 'PATCH' }),
      invalidatesTags: ['Restaurant'],
    }),
    rejectRestaurant: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/admin/restaurants/${id}/reject`,
        method: 'PATCH',
        body: { reason },
      }),
      invalidatesTags: ['Restaurant'],
    }),
    suspendRestaurant: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/admin/restaurants/${id}/suspend`,
        method: 'PATCH',
        body: { reason },
      }),
      invalidatesTags: ['Restaurant'],
    }),
    unsuspendRestaurant: builder.mutation({
      query: (id) => ({ url: `/admin/restaurants/${id}/unsuspend`, method: 'PATCH' }),
      invalidatesTags: ['Restaurant'],
    }),

    // Rider applications
    getRiderApplications: builder.query({
      query: (params = {}) => ({ url: '/admin/riders', params }),
      transformResponse: (res) => ({
        riders: (res.data?.riders || []).map((r) => ({
          _id: r._id,
          userId: { name: r.name, email: r.email, phone: r.phone },
          profilePhoto: r.profilePhoto,
          nidNumber: r.riderProfile?.nidNumber,
          nidPhoto: r.riderProfile?.nidPhoto,
          vehicleType: r.riderProfile?.vehicleType,
          vehicleRegNumber: r.riderProfile?.vehicleRegNumber,
          vehicleRegPhoto: r.riderProfile?.vehicleRegPhoto,
          status: r.riderProfile?.applicationStatus,
          rejectionReason: r.riderProfile?.rejectionReason,
          createdAt: r.createdAt,
        })),
        pagination: res.pagination || res.data?.pagination,
      }),
      providesTags: ['Rider'],
    }),
    approveRider: builder.mutation({
      query: (id) => ({ url: `/admin/riders/${id}/approve`, method: 'PATCH' }),
      invalidatesTags: ['Rider'],
    }),
    rejectRider: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/admin/riders/${id}/reject`,
        method: 'PATCH',
        body: { reason },
      }),
      invalidatesTags: ['Rider'],
    }),

    // User management
    getUsers: builder.query({
      query: (params = {}) => ({ url: '/admin/users', params }),
      transformResponse: (res) => ({
        users: res.data?.users || [],
        pages: res.data?.pagination?.pages || res.pagination?.pages || 1,
        total: res.data?.pagination?.total || res.pagination?.total || 0,
      }),
      providesTags: ['User'],
    }),
    suspendUser: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/admin/users/${id}/suspend`,
        method: 'PATCH',
        body: { reason },
      }),
      invalidatesTags: ['User'],
    }),
    unsuspendUser: builder.mutation({
      query: (id) => ({ url: `/admin/users/${id}/unsuspend`, method: 'PATCH' }),
      invalidatesTags: ['User'],
    }),

    // Complaints
    getComplaints: builder.query({
      query: (params = {}) => ({ url: '/admin/complaints', params }),
      transformResponse: (res) => ({ complaints: res.data?.complaints || [], pagination: res.pagination || res.data?.pagination }),
      providesTags: ['Complaint'],
    }),
    updateComplaintStatus: builder.mutation({
      query: ({ id, status, note }) => ({
        url: `/admin/complaints/${id}`,
        method: 'PATCH',
        body: { status, adminNote: note },
      }),
      invalidatesTags: ['Complaint'],
    }),

    // Coupons
    getCoupons: builder.query({
      query: () => '/admin/coupons',
      transformResponse: (res) => ({ coupons: res.data?.coupons || [] }),
      providesTags: ['Coupon'],
    }),
    createCoupon: builder.mutation({
      query: (body) => ({ url: '/admin/coupons', method: 'POST', body }),
      invalidatesTags: ['Coupon'],
    }),
    updateCoupon: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/coupons/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Coupon'],
    }),
    deactivateCoupon: builder.mutation({
      query: (id) => ({ url: `/admin/coupons/${id}/deactivate`, method: 'PATCH' }),
      invalidatesTags: ['Coupon'],
    }),

    // Orders
    getAdminOrders: builder.query({
      query: ({ dateFrom, dateTo, ...rest } = {}) => ({
        url: '/admin/orders',
        params: { ...rest, from: dateFrom, to: dateTo },
      }),
      transformResponse: (res) => {
        const pagination = res.pagination || res.data?.pagination || {};
        return {
          orders: res.data?.orders || [],
          pages: pagination.pages || 1,
          total: pagination.total || 0,
          pagination,
        };
      },
      providesTags: ['Order'],
    }),
    cancelAdminOrder: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/orders/${id}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Order'],
    }),
  }),
});

export const {
  useGetAdminStatsQuery,
  useGetRestaurantApplicationsQuery,
  useApproveRestaurantMutation,
  useRejectRestaurantMutation,
  useSuspendRestaurantMutation,
  useUnsuspendRestaurantMutation,
  useGetRiderApplicationsQuery,
  useApproveRiderMutation,
  useRejectRiderMutation,
  useGetUsersQuery,
  useSuspendUserMutation,
  useUnsuspendUserMutation,
  useGetComplaintsQuery,
  useUpdateComplaintStatusMutation,
  useGetCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeactivateCouponMutation,
  useGetAdminOrdersQuery,
  useCancelAdminOrderMutation,
} = adminApi;
