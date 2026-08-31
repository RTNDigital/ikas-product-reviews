import axios from 'axios';

const api = axios.create({ baseURL: '' });

function makeGetRequest<T>({ url, token, data }: { url: string; token: string; data?: Record<string, unknown> }) {
  return api.get<T>(url, {
    headers: { Authorization: `JWT ${token}` },
    params: data,
  });
}

function makePostRequest<T>({ url, token, data }: { url: string; token: string; data?: Record<string, unknown> }) {
  return api.post<T>(url, data, {
    headers: { Authorization: `JWT ${token}` },
  });
}

function makePutRequest<T>({ url, token, data }: { url: string; token: string; data?: Record<string, unknown> }) {
  return api.put<T>(url, data, {
    headers: { Authorization: `JWT ${token}` },
  });
}

function makeDeleteRequest<T>({ url, token }: { url: string; token: string }) {
  return api.delete<T>(url, {
    headers: { Authorization: `JWT ${token}` },
  });
}

export const ApiRequests = {
  ikas: {
    getSettings: (token: string) =>
      makeGetRequest<{ data: { storeSettings: unknown; widgetSettings: unknown } }>({ url: '/api/ikas/settings', token }),
    updateStoreSettings: (token: string, data: Record<string, unknown>) =>
      makePutRequest<{ data: unknown }>({ url: '/api/ikas/settings/store', token, data }),
    updateWidgetSettings: (token: string, data: Record<string, unknown>) =>
      makePutRequest<{ data: unknown }>({ url: '/api/ikas/settings/widget', token, data }),
    getReviews: (token: string, params: Record<string, unknown>) =>
      makeGetRequest<{ data: unknown }>({ url: '/api/ikas/reviews', token, data: params }),
    updateReviewStatus: (token: string, data: Record<string, unknown>) =>
      makePostRequest<{ data: unknown }>({ url: '/api/ikas/reviews/status', token, data }),
    replyToReview: (token: string, data: Record<string, unknown>) =>
      makePostRequest<{ data: unknown }>({ url: '/api/ikas/reviews/reply', token, data }),
    deleteReview: (token: string, reviewId: string) =>
      makeDeleteRequest<{ data: unknown }>({ url: `/api/ikas/reviews/${reviewId}`, token }),
    getAnalytics: (token: string, params: Record<string, unknown>) =>
      makeGetRequest<{ data: unknown }>({ url: '/api/ikas/analytics', token, data: params }),
    getEmailLogs: (token: string, params: Record<string, unknown>) =>
      makeGetRequest<{ data: unknown }>({ url: '/api/ikas/email-logs', token, data: params }),
  },
};
