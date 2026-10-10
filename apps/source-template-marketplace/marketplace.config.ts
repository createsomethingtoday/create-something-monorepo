export interface MarketplaceConfig {
  headline: string;
  description: string;
  collection: 'featured' | 'all' | 'free';
  accent: string;
}
export const marketplaceConfig: MarketplaceConfig = {
  headline: 'Your next great website starts here.',
  description:
    'Exceptional websites, made by independent creators. Find your starting point and make it your own.',
  collection: 'featured',
  accent: '#146ef5'
};
