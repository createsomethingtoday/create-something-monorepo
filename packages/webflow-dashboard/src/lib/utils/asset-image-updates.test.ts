import { describe, expect, it } from 'vitest';

import { pickChangedAssetImageUpdateData } from './asset-image-updates';

describe('pickChangedAssetImageUpdateData', () => {
  it('drops unchanged attachment fields during text-only edits', () => {
    expect(
      pickChangedAssetImageUpdateData(
        {
          thumbnailUrl: 'https://cdn.example.com/thumb.png',
          secondaryThumbnails: ['https://cdn.example.com/secondary.png'],
          carouselImages: ['https://cdn.example.com/carousel-1.png']
        },
        {
          thumbnailUrl: 'https://cdn.example.com/thumb.png',
          secondaryThumbnails: ['https://cdn.example.com/secondary.png'],
          carouselImages: ['https://cdn.example.com/carousel-1.png']
        }
      )
    ).toEqual({});
  });

  it('keeps changed attachment fields', () => {
    expect(
      pickChangedAssetImageUpdateData(
        {
          thumbnailUrl: 'https://cdn.example.com/thumb.png',
          secondaryThumbnails: ['https://cdn.example.com/secondary.png'],
          carouselImages: ['https://cdn.example.com/carousel-1.png']
        },
        {
          thumbnailUrl: 'https://cdn.example.com/thumb-next.png',
          secondaryThumbnails: [
            'https://cdn.example.com/secondary.png',
            'https://cdn.example.com/secondary-2.png'
          ],
          carouselImages: [
            'https://cdn.example.com/carousel-1.png',
            'https://cdn.example.com/carousel-2.png'
          ]
        }
      )
    ).toEqual({
      thumbnailUrl: 'https://cdn.example.com/thumb-next.png',
      secondaryThumbnails: [
        'https://cdn.example.com/secondary.png',
        'https://cdn.example.com/secondary-2.png'
      ],
      carouselImages: [
        'https://cdn.example.com/carousel-1.png',
        'https://cdn.example.com/carousel-2.png'
      ]
    });
  });

  it('treats legacy single secondary thumbnail as unchanged when the array matches', () => {
    expect(
      pickChangedAssetImageUpdateData(
        {
          secondaryThumbnailUrl: 'https://cdn.example.com/secondary.png'
        },
        {
          secondaryThumbnails: ['https://cdn.example.com/secondary.png']
        }
      )
    ).toEqual({});
  });

  it('keeps attachment clears', () => {
    expect(
      pickChangedAssetImageUpdateData(
        {
          thumbnailUrl: 'https://cdn.example.com/thumb.png',
          secondaryThumbnails: ['https://cdn.example.com/secondary.png'],
          carouselImages: ['https://cdn.example.com/carousel-1.png']
        },
        {
          thumbnailUrl: null,
          secondaryThumbnails: [],
          carouselImages: []
        }
      )
    ).toEqual({
      thumbnailUrl: null,
      secondaryThumbnails: [],
      carouselImages: []
    });
  });
});
