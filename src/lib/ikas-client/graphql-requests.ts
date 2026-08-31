import { gql } from 'graphql-request';

export const GET_MERCHANT = gql`
  query getMerchant {
    getMerchant {
      id
      email
      storeName
    }
  }
`;

export const GET_AUTHORIZED_APP = gql`
  query getAuthorizedApp {
    getAuthorizedApp {
      id
      salesChannelId
    }
  }
`;

export const LIST_STOREFRONT = gql`
  query listStorefront {
    listStorefront {
      id
    }
  }
`;

export const CREATE_STOREFRONT_JS_SCRIPT = gql`
  mutation createStorefrontJSScript($input: CreateStorefrontJSScriptInput!) {
    createStorefrontJSScript(input: $input) {
      id
      name
    }
  }
`;

// NOTE: The ikas admin GraphQL API's listProduct query has no dedicated
// "slug" filter argument (only id, sku, barcodeList, categoryIds, brandId,
// vendorId, tagIds, attributeId, totalStock, stockLocationId,
// variantTypeId, salesChannelIds, search, sort, pagination). The product
// slug lives under Product.metaData.slug. To resolve a slug to a
// productId, we search by the slug text and match the exact slug
// client-side (see product-lookup route).
export const LIST_PRODUCT = gql`
  query listProduct($search: String, $pagination: PaginationInput) {
    listProduct(search: $search, pagination: $pagination) {
      data {
        id
        name
        metaData {
          id
          slug
        }
      }
      count
    }
  }
`;
