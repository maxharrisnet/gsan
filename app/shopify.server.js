import '@shopify/shopify-app-remix/adapters/node';
import { ApiVersion, AppDistribution, shopifyApp } from '@shopify/shopify-app-remix/server';
import { PrismaSessionStorage } from '@shopify/shopify-app-session-storage-prisma';
import prisma from './db.server';

async function createSessionTableIfNeeded() {
	try {
		await prisma.$queryRaw`CREATE TABLE IF NOT EXISTS Session (
      id VARCHAR(255) PRIMARY KEY,
      shop VARCHAR(255) NOT NULL,
      state VARCHAR(255) NOT NULL,
      isOnline BOOLEAN DEFAULT false,
      scope VARCHAR(255),
      expires TIMESTAMP,
      accessToken VARCHAR(255) NOT NULL,
      userId BIGINT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

		await prisma.$queryRaw`CREATE INDEX IF NOT EXISTS session_shop_idx ON Session(shop)`;
	} catch (error) {
		console.error('🔴 Error creating session table:', error);
		throw error;
	}
}

const shopify = shopifyApp({
	apiKey: process.env.SHOPIFY_API_KEY,
	apiSecretKey: process.env.SHOPIFY_API_SECRET || '',
	apiVersion: ApiVersion.October24,
	scopes: process.env.SCOPES?.split(','),
	appUrl: process.env.SHOPIFY_APP_URL || '',
	authPathPrefix: '/auth',
	sessionStorage: new PrismaSessionStorage(prisma),
	distribution: AppDistribution.AppStore,
	future: {
		unstable_newEmbeddedAuthStrategy: true,
		removeRest: true,
	},
	...(process.env.SHOP_CUSTOM_DOMAIN ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] } : {}),
	hooks: {
		afterAuth: async ({ session }) => {
			await createSessionTableIfNeeded();
		},
	},
});

export default shopify;
export const apiVersion = ApiVersion.October24;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
