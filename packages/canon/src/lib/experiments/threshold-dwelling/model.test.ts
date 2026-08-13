import { describe, expect, it } from 'vitest';

import { THRESHOLD_DWELLING_DESIGN } from './model.js';

describe('Threshold Dwelling construction allowance', () => {
  it('carries the aligned base, contingency, and material distribution through the public model', () => {
    const allowance = THRESHOLD_DWELLING_DESIGN.constructionAllowance;
    const baseConstructionCost = allowance.lineItems.reduce(
      (total, item) => total + item.estimate,
      0
    );
    const categoryCost = (category: string) =>
      allowance.lineItems
        .filter((item) => item.category === category)
        .reduce((total, item) => total + item.estimate, 0);
    const lineItemCost = (description: string) =>
      allowance.lineItems.find((item) => item.description === description)?.estimate;

    expect(THRESHOLD_DWELLING_DESIGN.revision).toBe('0.4');
    expect(baseConstructionCost).toBe(814_000);
    expect(allowance.contingencyRate).toBe(0.1);
    expect(allowance.workingConstructionAuthorization).toBe(895_400);
    expect(allowance.totalSF).toBe(THRESHOLD_DWELLING_DESIGN.buildMetrics.conditionedFloorAreaSF);
    expect(
      Object.values(allowance.materialDistribution).reduce((total, amount) => total + amount, 0)
    ).toBe(baseConstructionCost);
    expect(
      [...new Set(allowance.lineItems.map((item) => item.category))]
        .map((category) => categoryCost(category))
        .reduce((total, amount) => total + amount, 0)
    ).toBe(baseConstructionCost);
    expect(lineItemCost('Engineered concrete foundation datum')).toBe(65_000);
    expect(categoryCost('Systems')).toBe(138_000);
    expect(allowance.materialDistribution.concreteAssemblies).toBe(121_000);
    expect(allowance.materialDistribution.cedar).toBe(20_000);
    expect(allowance.excludedOwnerCosts).toEqual(
      expect.arrayContaining([
        'Architecture and engineering',
        'Survey and geotechnical investigation',
        'Permits, utility taps, and impact fees',
        'Land, financing, and owner furnishings'
      ])
    );
  });

  it('limits cedar to separately priced protected and tactile roles', () => {
    const strategy = THRESHOLD_DWELLING_DESIGN.materialStrategy;
    const allowanceText = JSON.stringify(THRESHOLD_DWELLING_DESIGN.constructionAllowance);

    expect(strategy.foundation.primaryMaterial).toBe('reinforced concrete');
    expect(strategy.cedar.allowedLocations).toEqual([
      'recessed entry and selected protected soffits',
      'one public-room ceiling plane',
      'select tactile millwork'
    ]);
    expect(strategy.cedar.prohibitedLocations).toEqual(
      expect.arrayContaining([
        'primary exterior wall fields',
        'exterior decking',
        'bedroom ceilings',
        'cabinetry throughout'
      ])
    );
    expect(allowanceText).not.toMatch(/cedar board|cedar decking|cedar throughout/i);
  });

  it('reconciles layout quantities, material quantities, unit rates, and line totals', () => {
    const metrics = THRESHOLD_DWELLING_DESIGN.buildMetrics;
    const lineItems = THRESHOLD_DWELLING_DESIGN.constructionAllowance.lineItems;
    const lineItem = (description: string) =>
      lineItems.find((item) => item.description === description);

    expect(metrics.conditionedFloorAreaSF).toBe(
      metrics.footprintWidthFT * metrics.footprintDepthFT
    );
    expect(metrics.buildingPerimeterLF).toBe(
      2 * (metrics.footprintWidthFT + metrics.footprintDepthFT)
    );
    expect(metrics.grossExteriorWallAreaSF).toBe(
      metrics.buildingPerimeterLF * metrics.averageExteriorWallHeightFT
    );
    expect(metrics.opaqueWallAreaSF + metrics.glazingAreaSF).toBe(metrics.grossExteriorWallAreaSF);

    for (const item of lineItems) {
      expect(item.estimate, item.description).toBe(Math.round(item.quantity * item.unitRate));
    }

    expect(lineItem('Engineered concrete foundation datum')?.quantity).toBe(
      metrics.conditionedFloorAreaSF
    );
    expect(lineItem('Primary opaque rainscreen walls')?.quantity).toBe(metrics.opaqueWallAreaSF);
    expect(lineItem('Windows & glazing')?.quantity).toBe(metrics.glazingAreaSF);
    expect(lineItem('Standing-seam roofing')?.quantity).toBe(metrics.roofAreaSF);
    expect(lineItem('Service carport structure')?.quantity).toBe(metrics.carportAreaSF);
    expect(lineItem('Independent concrete terraces')?.quantity).toBe(metrics.terraceAreaSF);
  });
});
