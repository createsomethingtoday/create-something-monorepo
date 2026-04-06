import assert from 'node:assert/strict';
import test from 'node:test';

import { pickChangedAssetImageUpdateData } from './asset-image-updates';

test('pickChangedAssetImageUpdateData drops unchanged attachment fields', () => {
  assert.deepEqual(
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
    ),
    {}
  );
});

test('pickChangedAssetImageUpdateData keeps changed attachment fields', () => {
  assert.deepEqual(
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
    ),
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
  );
});
