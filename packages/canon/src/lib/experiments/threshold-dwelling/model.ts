export type ThresholdDwellingCostCategory =
  | 'Site'
  | 'Structure'
  | 'Envelope'
  | 'Interior'
  | 'Systems'
  | 'Fixtures'
  | 'Exterior';

export type ThresholdDwellingMaterialGroup =
  | 'concreteAssemblies'
  | 'steelRoofCarportAssemblies'
  | 'glazing'
  | 'opaqueEnvelope'
  | 'insulationAirWaterControl'
  | 'cedar'
  | 'other';

export type ThresholdDwellingCostUnit = 'SF' | 'LF' | 'EA' | 'ZONE' | 'BATH' | 'ALLOW';

export interface ThresholdDwellingCostLineItem {
  category: ThresholdDwellingCostCategory;
  description: string;
  estimate: number;
  quantity: number;
  unit: ThresholdDwellingCostUnit;
  unitRate: number;
  materialGroup: ThresholdDwellingMaterialGroup;
  notes?: string;
}

export interface ThresholdDwellingBuildMetrics {
  footprintWidthFT: number;
  footprintDepthFT: number;
  conditionedFloorAreaSF: number;
  buildingPerimeterLF: number;
  averageExteriorWallHeightFT: number;
  grossExteriorWallAreaSF: number;
  glazingAreaSF: number;
  opaqueWallAreaSF: number;
  roofAreaSF: number;
  drivewayAreaSF: number;
  terraceAreaSF: number;
  carportAreaSF: number;
  dogUtilityAreaSF: number;
  protectedCedarAreaSF: number;
  publicRoomCedarCeilingAreaSF: number;
  durableCaseworkLengthLF: number;
  selectCedarMillworkLengthLF: number;
  hvacZoneCount: number;
  bathroomCount: number;
  quantityStatus: 'design-development-assumptions-require-field-and-trade-validation';
}

export interface ThresholdDwellingConstructionAllowance {
  totalSF: number;
  lineItems: ThresholdDwellingCostLineItem[];
  contingencyRate: number;
  workingConstructionAuthorization: number;
  materialDistribution: Record<ThresholdDwellingMaterialGroup, number>;
  excludedOwnerCosts: string[];
  assumptions: string[];
  lastUpdated: string;
}

export interface ThresholdDwellingMaterial {
  name: string;
  category: 'structure' | 'envelope' | 'interior' | 'exterior';
  color: string;
  location: string;
  notes: string;
}

export interface ThresholdDwellingMaterialStrategy {
  foundation: {
    primaryMaterial: 'reinforced concrete';
    systemStatus: 'geotechnical-and-structural-design-required';
  };
  envelope: {
    primaryOpaqueCladding: 'mineral panel and formed metal rainscreen';
  };
  cedar: {
    role: 'protected accent';
    allowedLocations: string[];
    prohibitedLocations: string[];
  };
}

const buildMetrics: ThresholdDwellingBuildMetrics = {
  footprintWidthFT: 65,
  footprintDepthFT: 42,
  conditionedFloorAreaSF: 2730,
  buildingPerimeterLF: 214,
  averageExteriorWallHeightFT: 10,
  grossExteriorWallAreaSF: 2140,
  glazingAreaSF: 950,
  opaqueWallAreaSF: 1190,
  roofAreaSF: 3000,
  drivewayAreaSF: 800,
  terraceAreaSF: 450,
  carportAreaSF: 270,
  dogUtilityAreaSF: 60,
  protectedCedarAreaSF: 300,
  publicRoomCedarCeilingAreaSF: 400,
  durableCaseworkLengthLF: 80,
  selectCedarMillworkLengthLF: 16,
  hvacZoneCount: 4,
  bathroomCount: 4,
  quantityStatus: 'design-development-assumptions-require-field-and-trade-validation'
};

const lineItems: ThresholdDwellingCostLineItem[] = [
  {
    category: 'Site',
    description: 'Site preparation',
    estimate: 14_000,
    quantity: 1,
    unit: 'ALLOW',
    unitRate: 14_000,
    materialGroup: 'other',
    notes: 'Clearing, grading, drainage, and utility coordination · verify after survey'
  },
  {
    category: 'Site',
    description: 'Engineered concrete foundation datum',
    estimate: 65_000,
    quantity: buildMetrics.conditionedFloorAreaSF,
    unit: 'SF',
    unitRate: 65_000 / buildMetrics.conditionedFloorAreaSF,
    materialGroup: 'concreteAssemblies',
    notes: '8% planning allowance · final system after geotechnical and structural design'
  },
  {
    category: 'Site',
    description: 'Driveway & parking',
    estimate: 12_000,
    quantity: buildMetrics.drivewayAreaSF,
    unit: 'SF',
    unitRate: 12_000 / buildMetrics.drivewayAreaSF,
    materialGroup: 'other'
  },
  {
    category: 'Structure',
    description: 'Coated steel frame & columns',
    estimate: 85_000,
    quantity: buildMetrics.conditionedFloorAreaSF,
    unit: 'SF',
    unitRate: 85_000 / buildMetrics.conditionedFloorAreaSF,
    materialGroup: 'steelRoofCarportAssemblies',
    notes: 'High-performance coating or galvanizing · reprice with fabricator'
  },
  {
    category: 'Structure',
    description: 'Roof structure',
    estimate: 35_000,
    quantity: buildMetrics.roofAreaSF,
    unit: 'SF',
    unitRate: 35_000 / buildMetrics.roofAreaSF,
    materialGroup: 'steelRoofCarportAssemblies'
  },
  {
    category: 'Envelope',
    description: 'Primary opaque rainscreen walls',
    estimate: 48_000,
    quantity: buildMetrics.opaqueWallAreaSF,
    unit: 'SF',
    unitRate: 48_000 / buildMetrics.opaqueWallAreaSF,
    materialGroup: 'opaqueEnvelope',
    notes: 'Mineral panels with formed-metal service fields · ventilated drainage cavity'
  },
  {
    category: 'Envelope',
    description: 'Windows & glazing',
    estimate: 95_000,
    quantity: buildMetrics.glazingAreaSF,
    unit: 'SF',
    unitRate: 95_000 / buildMetrics.glazingAreaSF,
    materialGroup: 'glazing',
    notes: 'Low-E insulated glazing · obtain current installed package quote'
  },
  {
    category: 'Envelope',
    description: 'Standing-seam roofing',
    estimate: 28_000,
    quantity: buildMetrics.roofAreaSF,
    unit: 'SF',
    unitRate: 28_000 / buildMetrics.roofAreaSF,
    materialGroup: 'steelRoofCarportAssemblies',
    notes: 'Galvalume or coated metal · reprice with roofing package'
  },
  {
    category: 'Envelope',
    description: 'Insulation & air/water control',
    estimate: 18_000,
    quantity: buildMetrics.grossExteriorWallAreaSF,
    unit: 'SF',
    unitRate: 18_000 / buildMetrics.grossExteriorWallAreaSF,
    materialGroup: 'insulationAirWaterControl'
  },
  {
    category: 'Interior',
    description: 'Interior walls & doors',
    estimate: 32_000,
    quantity: buildMetrics.conditionedFloorAreaSF,
    unit: 'SF',
    unitRate: 32_000 / buildMetrics.conditionedFloorAreaSF,
    materialGroup: 'other'
  },
  {
    category: 'Interior',
    description: 'Polished concrete floor finish',
    estimate: 38_000,
    quantity: buildMetrics.conditionedFloorAreaSF,
    unit: 'SF',
    unitRate: 38_000 / buildMetrics.conditionedFloorAreaSF,
    materialGroup: 'concreteAssemblies',
    notes: 'Finish allowance only · coordinate mix, joints, curing, mockup, and sealer'
  },
  {
    category: 'Interior',
    description: 'Durable casework',
    estimate: 44_000,
    quantity: buildMetrics.durableCaseworkLengthLF,
    unit: 'LF',
    unitRate: 44_000 / buildMetrics.durableCaseworkLengthLF,
    materialGroup: 'other',
    notes: 'Painted or documented veneer casework; cedar is not the default field material'
  },
  {
    category: 'Interior',
    description: 'Select cedar millwork premium',
    estimate: 8_000,
    quantity: buildMetrics.selectCedarMillworkLengthLF,
    unit: 'LF',
    unitRate: 8_000 / buildMetrics.selectCedarMillworkLengthLF,
    materialGroup: 'cedar',
    notes: 'Selected tactile touchpoints only · supply, movement, finish, and mockup review'
  },
  {
    category: 'Interior',
    description: 'Gypsum & acoustic ceilings',
    estimate: 16_000,
    quantity: buildMetrics.conditionedFloorAreaSF - buildMetrics.publicRoomCedarCeilingAreaSF,
    unit: 'SF',
    unitRate:
      16_000 / (buildMetrics.conditionedFloorAreaSF - buildMetrics.publicRoomCedarCeilingAreaSF),
    materialGroup: 'other'
  },
  {
    category: 'Interior',
    description: 'Public-room cedar ceiling premium',
    estimate: 4_000,
    quantity: buildMetrics.publicRoomCedarCeilingAreaSF,
    unit: 'SF',
    unitRate: 4_000 / buildMetrics.publicRoomCedarCeilingAreaSF,
    materialGroup: 'cedar',
    notes: 'One selected public-room ceiling plane; excludes bedroom ceilings'
  },
  {
    category: 'Interior',
    description: 'Paint & mineral finishes',
    estimate: 20_000,
    quantity: buildMetrics.conditionedFloorAreaSF,
    unit: 'SF',
    unitRate: 20_000 / buildMetrics.conditionedFloorAreaSF,
    materialGroup: 'other'
  },
  {
    category: 'Systems',
    description: 'HVAC',
    estimate: 46_000,
    quantity: buildMetrics.hvacZoneCount,
    unit: 'ZONE',
    unitRate: 46_000 / buildMetrics.hvacZoneCount,
    materialGroup: 'other',
    notes: 'Zoned heat-pump concept · equipment and distribution sized by engineer'
  },
  {
    category: 'Systems',
    description: 'Electrical',
    estimate: 40_000,
    quantity: buildMetrics.conditionedFloorAreaSF,
    unit: 'SF',
    unitRate: 40_000 / buildMetrics.conditionedFloorAreaSF,
    materialGroup: 'other'
  },
  {
    category: 'Systems',
    description: 'Plumbing',
    estimate: 43_000,
    quantity: buildMetrics.bathroomCount,
    unit: 'BATH',
    unitRate: 43_000 / buildMetrics.bathroomCount,
    materialGroup: 'other',
    notes: 'Four full baths · validate routing and fixture package'
  },
  {
    category: 'Systems',
    description: 'Solar preparation',
    estimate: 9_000,
    quantity: 1,
    unit: 'ALLOW',
    unitRate: 9_000,
    materialGroup: 'other'
  },
  {
    category: 'Fixtures',
    description: 'Kitchen appliances',
    estimate: 16_000,
    quantity: 1,
    unit: 'ALLOW',
    unitRate: 16_000,
    materialGroup: 'other'
  },
  {
    category: 'Fixtures',
    description: 'Bathroom fixtures',
    estimate: 22_000,
    quantity: buildMetrics.bathroomCount,
    unit: 'BATH',
    unitRate: 22_000 / buildMetrics.bathroomCount,
    materialGroup: 'other'
  },
  {
    category: 'Fixtures',
    description: 'Lighting',
    estimate: 14_000,
    quantity: buildMetrics.conditionedFloorAreaSF,
    unit: 'SF',
    unitRate: 14_000 / buildMetrics.conditionedFloorAreaSF,
    materialGroup: 'other'
  },
  {
    category: 'Exterior',
    description: 'Service carport structure',
    estimate: 18_000,
    quantity: buildMetrics.carportAreaSF,
    unit: 'SF',
    unitRate: 18_000 / buildMetrics.carportAreaSF,
    materialGroup: 'steelRoofCarportAssemblies'
  },
  {
    category: 'Exterior',
    description: 'Protected cedar accents',
    estimate: 8_000,
    quantity: buildMetrics.protectedCedarAreaSF,
    unit: 'SF',
    unitRate: 8_000 / buildMetrics.protectedCedarAreaSF,
    materialGroup: 'cedar',
    notes: 'Recessed entry and selected sheltered soffits only · finish mockup required'
  },
  {
    category: 'Exterior',
    description: 'Independent concrete terraces',
    estimate: 18_000,
    quantity: buildMetrics.terraceAreaSF,
    unit: 'SF',
    unitRate: 18_000 / buildMetrics.terraceAreaSF,
    materialGroup: 'concreteAssemblies',
    notes: 'Slope and isolate from conditioned slab · coordinate thresholds and drainage'
  },
  {
    category: 'Exterior',
    description: 'Dog utility enclosure',
    estimate: 8_000,
    quantity: buildMetrics.dogUtilityAreaSF,
    unit: 'SF',
    unitRate: 8_000 / buildMetrics.dogUtilityAreaSF,
    materialGroup: 'other'
  },
  {
    category: 'Exterior',
    description: 'Landscaping allowance',
    estimate: 10_000,
    quantity: 1,
    unit: 'ALLOW',
    unitRate: 10_000,
    materialGroup: 'other'
  }
];

const baseConstructionCost = lineItems.reduce((total, item) => total + item.estimate, 0);
const contingencyRate = 0.1;
const materialGroups: ThresholdDwellingMaterialGroup[] = [
  'concreteAssemblies',
  'steelRoofCarportAssemblies',
  'glazing',
  'opaqueEnvelope',
  'insulationAirWaterControl',
  'cedar',
  'other'
];
const materialDistribution = Object.fromEntries(
  materialGroups.map((group) => [
    group,
    lineItems
      .filter((item) => item.materialGroup === group)
      .reduce((total, item) => total + item.estimate, 0)
  ])
) as Record<ThresholdDwellingMaterialGroup, number>;

const constructionAllowance: ThresholdDwellingConstructionAllowance = {
  totalSF: 2730,
  lineItems,
  contingencyRate,
  workingConstructionAuthorization: Math.round(baseConstructionCost * (1 + contingencyRate)),
  materialDistribution,
  excludedOwnerCosts: [
    'Architecture and engineering',
    'Survey and geotechnical investigation',
    'Permits, utility taps, and impact fees',
    'GC general conditions, overhead, and profit unless expressly included',
    'Taxes and further escalation',
    'Land, financing, and owner furnishings'
  ],
  assumptions: [
    'Grandview / North Central Texas design-development allowance · validate with current local trade proposals',
    'Installed-assembly allowances combine materials, fabrication, labor, and subcontractor margin; they are not raw-material prices',
    'Steel, glazing, concrete, enclosure, and MEP packages require current quotes before procurement',
    'The 10% design contingency is shown separately and is not embedded in line items',
    'Concept estimate only · not a bid, guaranteed maximum price, permit set, or purchasing authorization'
  ],
  lastUpdated: 'July 2026'
};

const materialStrategy: ThresholdDwellingMaterialStrategy = {
  foundation: {
    primaryMaterial: 'reinforced concrete',
    systemStatus: 'geotechnical-and-structural-design-required'
  },
  envelope: {
    primaryOpaqueCladding: 'mineral panel and formed metal rainscreen'
  },
  cedar: {
    role: 'protected accent',
    allowedLocations: [
      'recessed entry and selected protected soffits',
      'one public-room ceiling plane',
      'select tactile millwork'
    ],
    prohibitedLocations: [
      'primary exterior wall fields',
      'exterior decking',
      'bedroom ceilings',
      'cabinetry throughout'
    ]
  }
};

const materialPalette: ThresholdDwellingMaterial[] = [
  {
    name: 'Reinforced Concrete',
    category: 'structure',
    color: '#8a8a86',
    location: 'Foundation datum + interior slab',
    notes: 'Final foundation system by geotechnical and structural design'
  },
  {
    name: 'Coated Steel',
    category: 'structure',
    color: '#202326',
    location: 'Columns + beams',
    notes: 'High-performance exterior coating or galvanizing'
  },
  {
    name: 'Low-E Insulated Glass',
    category: 'envelope',
    color: '#a8c7d1',
    location: 'Primary openings',
    notes: 'Performance and shading study required'
  },
  {
    name: 'Mineral Rainscreen',
    category: 'envelope',
    color: '#c8c6bf',
    location: 'Primary opaque wall fields',
    notes: 'Ventilated drainage and drying cavity'
  },
  {
    name: 'Formed Metal',
    category: 'envelope',
    color: '#34383a',
    location: 'Roof + service volumes + flashings',
    notes: 'Coordinate corrosion and movement details'
  },
  {
    name: 'Protected Cedar',
    category: 'envelope',
    color: '#9c734e',
    location: 'Recessed entry + selected soffits',
    notes: 'Sheltered accents only; finish and end-grain mockup'
  },
  {
    name: 'Polished Concrete',
    category: 'interior',
    color: '#9a9590',
    location: 'Conditioned floor datum',
    notes: 'Coordinate joints, curing, sealer, and tolerance'
  },
  {
    name: 'Large-Format Porcelain',
    category: 'interior',
    color: '#d8d5cf',
    location: 'Baths + laundry',
    notes: 'Role-only finish datum; select product, waterproofing, slip resistance, transitions, and maintenance requirements before issue'
  },
  {
    name: 'Gypsum + Mineral Finish',
    category: 'interior',
    color: '#eeede7',
    location: 'Walls + bedroom ceilings',
    notes: 'Quiet neutral field around the structural frame'
  },
  {
    name: 'Cedar Accent',
    category: 'interior',
    color: '#a67c52',
    location: 'Public ceiling + select millwork',
    notes: 'Not the default cabinetry or bedroom finish'
  },
  {
    name: 'Durable Casework',
    category: 'interior',
    color: '#6f706d',
    location: 'Kitchen + storage',
    notes: 'Painted or documented veneer with selected wood touchpoints'
  },
  {
    name: 'Concrete Terrace',
    category: 'exterior',
    color: '#aaa9a4',
    location: 'Entry + patios',
    notes: 'Independent slabs, sloped and isolated from conditioned floor'
  },
  {
    name: 'Decomposed Granite',
    category: 'exterior',
    color: '#c9c0b0',
    location: 'Drive + paths',
    notes: 'Positive drainage away from concrete datum'
  }
];

export const THRESHOLD_DWELLING_DESIGN = {
  status: 'design-development',
  revision: '0.5',
  buildMetrics,
  materialStrategy,
  constructionAllowance,
  materialPalette
} as const;
