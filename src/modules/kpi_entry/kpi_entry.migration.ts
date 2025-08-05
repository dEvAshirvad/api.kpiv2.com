import logger from '@/configs/logger';
import { KpiEntryModel } from './kpi_entry.model';
import { KpiTemplateModel } from '../kpi_template/kpi_template.model';
import { ExternalDataService } from './kpi_entry.external-data';
import axios from 'axios';
import env from '@/configs/env';

export interface CsvKpiData {
  officerName: string;
  courtName?: string; // For tehsildar data, include court name
  kpiValues: {
    [key: string]: number;
  };
}

export interface CsvParserConfig {
  departmentSlug: string;
  role: string;
  officerNameColumn: string;
  kpiMappings: {
    [kpiName: string]: {
      searchTerms: string[];
      calculationType: 'percentage' | 'direct';
    };
  };
}

export interface HeaderMapping {
  originalHeader: string;
  normalizedHeader: string;
  confidence: number;
}

export interface MigrationResult {
  totalRecords: number;
  successfulEntries: number;
  failedEntries: number;
  skippedEntries: number;
  errors: string[];
  details: {
    [officerName: string]: {
      success: boolean;
      message: string;
      entryId?: string;
    };
  };
}

export class KpiMigrationService {
  private static authUrl = env.AUTH_URL;

  // Header normalization mappings for different variations
  private static headerNormalizations: { [key: string]: string[] } = {
    'पीठासीन अधिकारी': [
      'पीठासीन अधिकारी का नाम',
      'पीठासीन अधिकारी',
      'अधिकारी',
      'officer',
      'name',
      'नाम',
      'अधिकारी का नाम',
      'पदाधिकारी',
    ],
    officerName: [
      'पीठासीन अधिकारी',
      'पीठासीन अधिकारी का नाम',
      'अधिकारी',
      'officer',
      'name',
      'नाम',
      'अधिकारी का नाम',
      'पदाधिकारी',
    ],
    व्यपवर्तन: [
      'व्यपवर्तन',
      'व्यपवर्तन (अ-2)',
      'व्यपवर्तन अ-2',
      'disposal',
      'case disposal',
    ],
    'अभिलेख दुरुस्ती/त्रुटियुधार': [
      'अभिलेख दुरुस्ती/त्रुटियुधार',
      'त्रुटि सुधार',
      'त्रुटि सुधार (अ-6-अ)',
      'त्रुटि सुधार अ-6-अ',
      'error correction',
      'record correction',
      'अभिलेख दुरुस्ती',
    ],
    'अपील निराकरण': ['अपील निराकरण', 'appeal disposal', 'appeal resolution'],

    'आँगनबाड़ी/स्कूल/पीडीएस शॉप/विकास कार्य निरीक्षण': [
      'आँगनबाड़ी/स्कूल/पीडीएस शॉप/विकास कार्य निरीक्षण',
      'आंगनबाड़ी / स्कुल / पीडीएस शॉप / स्वास्थ्य केन्द्र निरीक्षण',
      'आंगनबाड़ी/स्कूल/पीडीएस शॉप/स्वास्थ्य केन्द्र निरीक्षण',
      'आंगनबाड़ी स्कूल पीडीएस शॉप स्वास्थ्य केन्द्र निरीक्षण',
      'inspection',
      'field inspection',
    ],

    'टीएल/जनदर्शन/जनशिकायत/पीजी': [
      'टीएल/जनदर्शन/जनशिकायत/पीजी',
      'टी.एल./जनदर्शन / जनशिकायत /लोक सेवा',
      'टीएल / जनदर्शन / जनशिकायत / पीजी',
      'TL / जनदर्शन / जनशिकायत / PG',
      'TL/जनदर्शन/जनशिकायत/PG',
      'public hearing',
      'grievance',
    ],
    'खाता विभाजन (विवादित + अविवादित)': [
      'खाता विभाजन (विवादित + अविवादित)',
      'खाता विभाजन',
      'account division',
    ],
    'नामांतरण (विवादित + अविवादित)': [
      'नामांतरण (विवादित + अविवादित)',
      'नामांतरण',
      'name transfer',
    ],
    सीमांकन: ['सीमांकन', 'demarcation'],
    'विविध राजस्व मामले (बी-121)': [
      'विविध राजस्व मामले (बी-121)',
      'विविध राजस्व मामले',
      'miscellaneous revenue cases',
    ],
    'कुल निराकरण': ['कुल निराकरण', 'कूल निराकरण', 'total disposal'],
    'जाति प्रमाणपत्र': [
      'जाति प्रमाणपत्र',
      'जाति प्रमाण पत्र',
      'caste certificate',
    ],
    'अवैध उत्खनन/अतिक्रमण': [
      'अवैध उत्खनन/अतिक्रमण',
      'अवैध उत्खनन /अतिक्रमण',
      'illegal excavation/encroachment',
    ],
    'आर बी सी 6 (4)': ['आर बी सी 6 (4)', 'RBC 6(4)', 'आर.बी.सी. 6 (4)'],
    'टी.एल./जनदर्शन / जनशिकायत /लोक सेवा': [
      'टी.एल./जनदर्शन / जनशिकायत /लोक सेवा',
      'टीएल/जनदर्शन/जनशिकायत/पीजी',
      'public hearing',
      'grievance',
    ],
  };

  // Sub-header normalization mappings
  private static subHeaderNormalizations: { [key: string]: string[] } = {
    'कुल दर्ज': ['कुल दर्ज', 'total registered', 'registered', 'total', 'दर्ज'],
    'कुल निराकृत': [
      'कुल निराकृत',
      'total disposed',
      'disposed',
      'निराकृत',
      'निपटाया',
    ],
    'कुल लंबित': ['कुल लंबित', 'total pending', 'pending', 'लंबित', 'बाकी'],
  };

  // Department-specific CSV parser configurations
  private static csvParserConfigs: { [key: string]: CsvParserConfig } = {
    'revenue-department-sdm': {
      departmentSlug: 'revenue-department',
      role: 'sdm',
      officerNameColumn: 'पीठासीन अधिकारी',
      kpiMappings: {
        व्यपवर्तन: {
          searchTerms: ['व्यपवर्तन'],
          calculationType: 'percentage',
        },
        'अभिलेख दुरुस्ती/त्रुटियुधार': {
          searchTerms: ['अभिलेख दुरुस्ती/त्रुटियुधार'],
          calculationType: 'percentage',
        },
        'अपील निराकरण': {
          searchTerms: ['अपील निराकरण'],
          calculationType: 'percentage',
        },
        'कुल प्रकरणों का निराकरण': {
          searchTerms: ['कुल प्रकरणों का निराकरण'],
          calculationType: 'percentage',
        },
        'जाति प्रमाणपत्र': {
          searchTerms: ['जाति प्रमाणपत्र'],
          calculationType: 'percentage',
        },
        'आँगनबाड़ी/स्कूल/पीडीएस शॉप/विकास कार्य निरीक्षण': {
          searchTerms: ['आँगनबाड़ी/स्कूल/पीडीएस शॉप/विकास कार्य निरीक्षण'],
          calculationType: 'percentage',
        },
        'RBC 6(4)': {
          searchTerms: ['RBC 6(4)'],
          calculationType: 'percentage',
        },
        'टीएल/जनदर्शन/जनशिकायत/पीजी': {
          searchTerms: ['टीएल/जनदर्शन/जनशिकायत/पीजी'],
          calculationType: 'percentage',
        },
      },
    },
    'revenue-department-tehsildar': {
      departmentSlug: 'revenue-department',
      role: 'tehsildar',
      officerNameColumn: 'पीठासीन अधिकारी',
      kpiMappings: {
        'खाता विभाजन (विवादित + अविवादित)': {
          searchTerms: ['खाता विभाजन (विवादित + अविवादित)', 'खाता विभाजन'],
          calculationType: 'percentage',
        },
        'नामांतरण (विवादित + अविवादित)': {
          searchTerms: ['नामांतरण (विवादित + अविवादित)', 'नामांतरण'],
          calculationType: 'percentage',
        },
        सीमांकन: {
          searchTerms: ['सीमांकन'],
          calculationType: 'percentage',
        },
        'विविध राजस्व मामले (बी-121)': {
          searchTerms: ['विविध राजस्व मामले (बी-121)', 'विविध राजस्व मामले'],
          calculationType: 'percentage',
        },
        'कुल निराकरण': {
          searchTerms: ['कूल निराकरण', 'कुल निराकरण'],
          calculationType: 'percentage',
        },
        'जाति प्रमाणपत्र': {
          searchTerms: ['जाति प्रमाण पत्र', 'जाति प्रमाणपत्र'],
          calculationType: 'percentage',
        },
        'अवैध उत्खनन/अतिक्रमण': {
          searchTerms: ['अवैध उत्खनन /अतिक्रमण', 'अवैध उत्खनन/अतिक्रमण'],
          calculationType: 'percentage',
        },
        'आर बी सी 6 (4)': {
          searchTerms: ['आर बी सी 6 (4)', 'RBC 6(4)'],
          calculationType: 'percentage',
        },
        'टी.एल./जनदर्शन / जनशिकायत /लोक सेवा': {
          searchTerms: [
            'टी.एल./जनदर्शन / जनशिकायत /लोक सेवा',
            'टीएल/जनदर्शन/जनशिकायत/पीजी',
          ],
          calculationType: 'percentage',
        },
      },
    },
    // Add more department-role configurations here
    // 'collector-office-collector': {
    //   departmentSlug: 'collector-office',
    //   role: 'collector',
    //   officerNameColumn: 'Collector Name',
    //   kpiMappings: {
    //     // Different KPI mappings for collector
    //   },
    // },
  };

  /**
   * Normalize header names to handle variations
   */
  private static normalizeHeader(
    header: string,
    normalizations: { [key: string]: string[] }
  ): string | null {
    const normalizedHeader = header.trim().toLowerCase();
    logger.debug(`Normalizing header: "${header}" -> "${normalizedHeader}"`);

    let bestMatch: {
      standardHeader: string;
      variation: string;
      score: number;
    } | null = null;

    for (const [standardHeader, variations] of Object.entries(normalizations)) {
      for (const variation of variations) {
        const variationLower = variation.toLowerCase();
        let score = 0;

        // Exact match gets highest score
        if (normalizedHeader === variationLower) {
          score = 100;
        }
        // Contains match gets lower score
        else if (
          normalizedHeader.includes(variationLower) ||
          variationLower.includes(normalizedHeader)
        ) {
          score = 50;
        }

        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { standardHeader, variation, score };
        }
      }
    }

    if (bestMatch) {
      logger.debug(
        `Best match: "${header}" to "${bestMatch.standardHeader}" via variation "${bestMatch.variation}" (score: ${bestMatch.score})`
      );
      return bestMatch.standardHeader;
    }

    logger.debug(`No match found for header: "${header}"`);
    return null;
  }

  /**
   * Find the best matching header with confidence score
   */
  private static findBestHeaderMatch(
    targetHeader: string,
    availableHeaders: string[],
    normalizations: { [key: string]: string[] }
  ): HeaderMapping | null {
    const normalizedTarget = this.normalizeHeader(targetHeader, normalizations);

    if (!normalizedTarget) {
      return null;
    }

    let bestMatch: HeaderMapping | null = null;
    let highestConfidence = 0;

    for (const header of availableHeaders) {
      // Skip empty headers
      if (!header || header.trim() === '') {
        continue;
      }

      const normalizedHeader = this.normalizeHeader(header, normalizations);

      if (normalizedHeader === normalizedTarget) {
        // Exact match
        const confidence = 1.0;
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = {
            originalHeader: header,
            normalizedHeader: normalizedHeader,
            confidence: confidence,
          };
        }
      } else if (
        normalizedHeader &&
        this.calculateSimilarity(header, targetHeader) > 0.7
      ) {
        // Fuzzy match
        const confidence = this.calculateSimilarity(header, targetHeader);
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = {
            originalHeader: header,
            normalizedHeader: normalizedHeader,
            confidence: confidence,
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Create dynamic header mapping for CSV parsing
   */
  private static createHeaderMapping(
    headers: string[],
    subHeaders: string[],
    departmentSlug: string,
    role: string
  ): { [key: string]: HeaderMapping } {
    const configKey = `${departmentSlug}-${role}`;
    const config = this.csvParserConfigs[configKey];

    if (!config) {
      throw new Error(`No CSV parser configuration found for ${configKey}`);
    }

    const headerMapping: { [key: string]: HeaderMapping } = {};

    // Map officer name column
    logger.info(`Looking for officer name column: ${config.officerNameColumn}`);
    logger.info(`Available headers: ${headers.join(', ')}`);

    const officerNameMatch = this.findBestHeaderMatch(
      config.officerNameColumn,
      headers,
      this.headerNormalizations
    );

    if (officerNameMatch) {
      headerMapping['officerName'] = officerNameMatch;
      logger.info(
        `Mapped officer name: ${officerNameMatch.originalHeader} -> ${officerNameMatch.normalizedHeader} (confidence: ${officerNameMatch.confidence})`
      );
    } else {
      logger.warn(
        `Could not find officer name column matching: ${config.officerNameColumn}`
      );
      // Try to find any header that contains officer-related terms
      for (const header of headers) {
        if (header.includes('अधिकारी') || header.includes('नाम')) {
          logger.info(`Found potential officer header: ${header}`);
        }
      }
    }

    // Map KPI columns
    for (const [kpiName, mapping] of Object.entries(config.kpiMappings)) {
      for (const searchTerm of mapping.searchTerms) {
        const kpiMatch = this.findBestHeaderMatch(
          searchTerm,
          headers,
          this.headerNormalizations
        );

        if (kpiMatch) {
          headerMapping[kpiName] = kpiMatch;
          logger.info(
            `Mapped KPI ${kpiName}: ${kpiMatch.originalHeader} -> ${kpiMatch.normalizedHeader} (confidence: ${kpiMatch.confidence})`
          );
          break; // Use the first matching search term
        }
      }

      if (!headerMapping[kpiName]) {
        logger.warn(`Could not find KPI column for: ${kpiName}`);
      }
    }

    return headerMapping;
  }

  /**
   * Parse CSV data and extract KPI values with dynamic header mapping
   */
  static parseCsvData(
    csvContent: string,
    departmentSlug: string,
    role: string
  ): CsvKpiData[] {
    try {
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].split(',');
      const subHeaders = lines[1].split(',');
      const data: CsvKpiData[] = [];

      logger.info(`CSV Headers: ${headers.join(', ')}`);
      logger.info(`CSV Sub-headers: ${subHeaders.join(', ')}`);

      // Create dynamic header mapping
      const headerMapping = this.createHeaderMapping(
        headers,
        subHeaders,
        departmentSlug,
        role
      );

      // Find the officer name column index
      const officerNameMapping = headerMapping['officerName'];
      if (!officerNameMapping) {
        throw new Error('Could not find officer name column');
      }

      const officerNameIndex = headers.findIndex(
        (header) => header.trim() === officerNameMapping.originalHeader
      );

      logger.info(`Officer name column index: ${officerNameIndex}`);

      if (officerNameIndex === -1) {
        throw new Error(
          `Officer name column '${officerNameMapping.originalHeader}' not found`
        );
      }

      // Process data rows (skip header)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = line.split(',');

        logger.info(`Processing line ${i}: ${line.substring(0, 100)}...`);
        logger.info(`Values length: ${values.length}`);
        logger.info(`Values: ${values.join(', ')}`);

        if (values.length < 2) {
          logger.warn(`Skipping line ${i} - insufficient values`);
          continue; // Skip empty lines
        }

        const officerName = values[officerNameIndex]?.trim();
        logger.info(`Officer name: ${officerName}`);

        if (!officerName) {
          logger.warn(`Skipping line ${i} - no officer name found`);
          continue;
        }

        const kpiValues: { [key: string]: number } = {};

        // Map CSV columns to KPI names using dynamic header mapping
        const configKey = `${departmentSlug}-${role}`;
        const config = this.csvParserConfigs[configKey];

        Object.entries(config.kpiMappings).forEach(([kpiName, mapping]) => {
          const kpiMapping = headerMapping[kpiName];

          if (!kpiMapping) {
            logger.warn(`No header mapping found for KPI: ${kpiName}`);
            return;
          }

          logger.info(
            `Processing KPI: ${kpiName} with mapped header: ${kpiMapping.originalHeader}`
          );

          if (mapping.calculationType === 'percentage') {
            // Get all KPI names for index calculation
            const allKpiNames = Object.keys(headerMapping).filter(
              (key) => key !== 'officerName'
            );
            const value = this.extractPercentageWithMapping(
              values,
              headers,
              subHeaders,
              kpiMapping,
              kpiName,
              allKpiNames
            );
            if (value !== null) {
              kpiValues[kpiName] = value;
              logger.info(`Extracted percentage for ${kpiName}: ${value}`);
            }
          } else {
            const value = this.extractDirectValueWithMapping(
              values,
              headers,
              subHeaders,
              kpiMapping,
              kpiName
            );
            if (value !== null) {
              kpiValues[kpiName] = value;
              logger.info(`Extracted direct value for ${kpiName}: ${value}`);
            }
          }
        });

        // Only include KPIs with valid values
        Object.entries(kpiValues).forEach(([kpiName, value]) => {
          if (value !== null && value >= 0) {
            logger.info(`KPI ${kpiName}: ${value}%`);
          } else {
            logger.warn(`Skipping KPI ${kpiName} - invalid value: ${value}`);
          }
        });

        if (Object.keys(kpiValues).length > 0) {
          // For tehsildar data, extract court name from the second column
          let courtName: string | undefined;
          if (role === 'tehsildar' && values.length > 1) {
            courtName = values[1]?.trim();
            logger.info(`Extracted court name: ${courtName}`);
          }

          data.push({
            officerName,
            courtName,
            kpiValues,
          });
          logger.info(
            `Added record for ${officerName}${courtName ? ` (${courtName})` : ''} with ${Object.keys(kpiValues).length} KPIs`
          );
        } else {
          logger.warn(`No valid KPI values found for ${officerName}`);
        }
      }

      logger.info(`Parsed ${data.length} records from CSV`);
      return data;
    } catch (error) {
      logger.error('Error parsing CSV data:', error);
      throw error;
    }
  }

  /**
   * Debug CSV parsing step by step with header mapping
   */
  static debugCsvParsing(csvContent: string): any {
    try {
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].split(',');
      const subHeaders = lines[1].split(',');

      console.log('=== CSV DEBUG ===');
      console.log('Lines:', lines.length);
      console.log('Headers:', headers);
      console.log('Sub-headers:', subHeaders);

      if (lines.length > 2) {
        const dataLine = lines[2];
        const values = dataLine.split(',');
        console.log('Data values:', values);
        console.log('Values length:', values.length);

        // Test header mapping for the appropriate role
        const role = headers.some((h) => h.includes('न्यायालय'))
          ? 'tehsildar'
          : 'sdm';
        const headerMapping = this.createHeaderMapping(
          headers,
          subHeaders,
          'revenue-department',
          role
        );
        console.log('Header mapping:', headerMapping);

        // Test officer name extraction
        const officerNameMapping = headerMapping['officerName'];
        const officerNameIndex = officerNameMapping
          ? headers.findIndex(
              (header) => header.trim() === officerNameMapping.originalHeader
            )
          : -1;
        console.log('Officer name index:', officerNameIndex);
        console.log('Officer name:', values[officerNameIndex]?.trim());

        // Test KPI extraction for each mapped KPI
        const kpiResults: { [key: string]: any } = {};
        Object.entries(headerMapping).forEach(([kpiName, mapping]) => {
          if (kpiName !== 'officerName') {
            const kpiIndex = headers.findIndex(
              (header) => header.trim() === mapping.originalHeader
            );
            const kpiValue = values[kpiIndex]?.trim();

            kpiResults[kpiName] = {
              originalHeader: mapping.originalHeader,
              normalizedHeader: mapping.normalizedHeader,
              confidence: mapping.confidence,
              index: kpiIndex,
              value: kpiValue,
            };
          }
        });

        console.log('KPI mapping results:', kpiResults);

        return {
          lines: lines.length,
          headers,
          subHeaders,
          dataValues: lines.length > 2 ? lines[2].split(',') : [],
          headerMapping,
          officerNameIndex,
          officerName: values[officerNameIndex]?.trim(),
          kpiResults,
        };
      }

      return { error: 'Not enough lines' };
    } catch (error) {
      console.error('Debug error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract percentage value from CSV columns using header mapping
   */
  private static extractPercentageWithMapping(
    values: string[],
    headers: string[],
    subHeaders: string[],
    kpiMapping: HeaderMapping,
    kpiName: string,
    allKpiNames: string[]
  ): number | null {
    try {
      logger.info(
        `Extracting percentage for KPI: ${kpiName} using mapping: ${kpiMapping.originalHeader}`
      );

      // Find the column index for this KPI
      const kpiIndex = headers.findIndex(
        (header) => header.trim() === kpiMapping.originalHeader
      );

      if (kpiIndex === -1) {
        logger.warn(`KPI column not found for ${kpiName}`);
        return null;
      }

      // For tehsildar data, we need to handle the specific CSV structure
      // The CSV structure is: [officer_name, court_name, kpi1_registered, kpi1_disposed, kpi1_pending, kpi2_registered, kpi2_disposed, kpi2_pending, ...]
      // Each KPI has 3 columns: registered, disposed, pending

      // Find the KPI position by looking at the actual CSV structure
      // We need to find which KPI this is in the sequence
      const configKey = 'revenue-department-tehsildar';
      const config = this.csvParserConfigs[configKey];

      if (!config) {
        logger.warn(`No config found for ${configKey}`);
        return null;
      }

      // Get the ordered list of KPIs as they appear in the CSV
      const orderedKpis = Object.keys(config.kpiMappings);
      const kpiIndexInSequence = orderedKpis.indexOf(kpiName);

      if (kpiIndexInSequence === -1) {
        logger.warn(`KPI ${kpiName} not found in sequence`);
        return null;
      }

      // Calculate the data indices based on the CSV structure
      // Each KPI has 3 columns, and we start from index 2 (after officer_name and court_name)
      const baseIndex = 2 + kpiIndexInSequence * 3;
      const registeredIndex = baseIndex;
      const disposedIndex = baseIndex + 1;

      logger.info(
        `KPI: ${kpiName}, KPI index in sequence: ${kpiIndexInSequence}, Base index: ${baseIndex}, Registered index: ${registeredIndex}, Disposed index: ${disposedIndex}`
      );

      const registeredValue = values[registeredIndex]?.trim();
      const disposedValue = values[disposedIndex]?.trim();

      logger.info(
        `Raw values at indices: registered[${registeredIndex}] = "${registeredValue}", disposed[${disposedIndex}] = "${disposedValue}"`
      );

      logger.info(
        `Registered value: ${registeredValue}, Disposed value: ${disposedValue}`
      );

      if (registeredValue && disposedValue) {
        const registered = parseInt(registeredValue);
        const disposed = parseInt(disposedValue);

        if (!isNaN(registered) && !isNaN(disposed) && registered > 0) {
          const exactPercentage = (disposed / registered) * 100;
          // Cap percentage at 100% to prevent validation errors
          const cappedPercentage = Math.min(exactPercentage, 100);
          const roundedPercentage = Math.round(cappedPercentage * 100) / 100; // Round to 2 decimal places
          logger.info(
            `${kpiName}: ${disposed}/${registered} = ${roundedPercentage.toFixed(2)}% (capped from ${exactPercentage.toFixed(2)}%)`
          );
          return roundedPercentage;
        }
      }

      logger.warn(
        `Could not find valid registered/disposed data for ${kpiName}`
      );
      return null;
    } catch (error) {
      logger.warn(`Error extracting percentage for ${kpiName}:`, error);
      return null;
    }
  }

  /**
   * Find sub-header column with normalization
   */
  private static findSubHeaderColumn(
    headers: string[],
    subHeaders: string[],
    startIndex: number,
    targetSubHeader: string,
    normalizations: { [key: string]: string[] }
  ): { index: number; value: string } | null {
    // Look in the vicinity of the KPI column (within 3 columns)
    const searchRange = 3;

    for (
      let i = Math.max(0, startIndex - searchRange);
      i <= Math.min(headers.length - 1, startIndex + searchRange);
      i++
    ) {
      const subHeader = subHeaders[i]?.trim();
      if (!subHeader) continue;

      const normalizedSubHeader = this.normalizeHeader(
        subHeader,
        normalizations
      );
      if (normalizedSubHeader === targetSubHeader) {
        return {
          index: i,
          value: subHeader,
        };
      }
    }

    return null;
  }

  /**
   * Extract direct value from CSV columns using header mapping
   */
  private static extractDirectValueWithMapping(
    values: string[],
    headers: string[],
    subHeaders: string[],
    kpiMapping: HeaderMapping,
    kpiName: string
  ): number | null {
    try {
      const kpiIndex = headers.findIndex(
        (header) => header.trim() === kpiMapping.originalHeader
      );

      if (kpiIndex === -1) return null;

      const value = values[kpiIndex]?.trim();
      if (value && !isNaN(Number(value))) {
        return Number(value);
      }

      return null;
    } catch (error) {
      logger.warn(`Error extracting direct value for ${kpiName}:`, error);
      return null;
    }
  }

  /**
   * Fetch member by name from auth service
   */
  static async fetchMemberByName(name: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.authUrl}/api/v1/members/name/${encodeURIComponent(
          name.trim()
        )}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.data.success && response.data.member?.user) {
        return response.data.member;
      } else {
        logger.warn(`No user found for name: ${name}`);
        return null;
      }
    } catch (error) {
      logger.error(`Error fetching member for name ${name}:`, error);
      return null;
    }
  }

  /**
   * Fetch member by name and court for tehsildar data
   * This handles cases where same name appears multiple times with different courts
   */
  static async fetchMemberByNameAndCourt(
    name: string,
    courtName: string
  ): Promise<any> {
    try {
      const response = await axios.get(`${this.authUrl}/api/v1/members`, {
        params: {
          role: 'tehsildar',
          departmentSlug: 'revenue-department',
          limit: 100,
        },
        timeout: 30000,
      });

      if (!response.data || !response.data.docs) {
        logger.error(`No members found for role tehsildar`);
        return null;
      }

      const members = response.data.docs;

      // First, find all members with the same name
      const membersWithSameName = members.filter(
        (m: any) => m.user.name === name
      );

      if (membersWithSameName.length === 0) {
        logger.error(`Member not found for name: ${name}`);
        return null;
      }

      // If only one member with this name, return it
      if (membersWithSameName.length === 1) {
        return membersWithSameName[0];
      }

      // If multiple members with same name, find the one that handles this court
      for (const member of membersWithSameName) {
        if (member.metadata?.kpiRef) {
          const courtRefs = member.metadata.kpiRef.filter(
            (ref: any) => ref.label === 'court' && ref.value === courtName
          );

          if (courtRefs.length > 0) {
            logger.info(
              `Found member ${member.user.name} for court: ${courtName}`
            );
            return member;
          }
        }
      }

      // If no exact match found, log and return the first member with this name
      logger.warn(
        `No exact court match found for ${name} and court ${courtName}, returning first member with this name`
      );
      return membersWithSameName[0];
    } catch (error) {
      logger.error(
        `Error fetching member for name ${name} and court ${courtName}:`,
        error
      );
      return null;
    }
  }

  /**
   * Create KPI entry from CSV data
   */
  static async createKpiEntryFromCsvData(
    csvData: CsvKpiData[],
    month: number,
    year: number,
    templateId: string,
    createdBy: string
  ): Promise<MigrationResult> {
    try {
      const result: MigrationResult = {
        totalRecords: csvData.length,
        successfulEntries: 0,
        failedEntries: 0,
        skippedEntries: 0,
        errors: [],
        details: {},
      };

      // Get template for validation
      const template = await KpiTemplateModel.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Process each CSV record
      for (const record of csvData) {
        try {
          // For tehsildar data, we need to handle multiple courts per member
          if (record.courtName) {
            // Find member by name first
            const member = await this.fetchMemberByName(record.officerName);

            if (!member) {
              result.skippedEntries++;
              result.details[record.officerName] = {
                success: false,
                message: 'Member not found',
              };
              continue;
            }

            // Find the specific court reference that matches this CSV record
            const matchingCourtRef = member.metadata?.kpiRef?.find(
              (ref: any) =>
                ref.label === 'court' && ref.value === record.courtName
            );

            if (!matchingCourtRef) {
              result.skippedEntries++;
              result.details[record.officerName] = {
                success: false,
                message: `Court '${record.courtName}' not found in member's kpiRef`,
              };
              continue;
            }

            // Check if entry already exists for this specific court
            const existingEntry = await KpiEntryModel.findOne({
              createdFor: member.userId,
              month,
              year,
              templateId,
              'kpiRef.value': record.courtName,
            });

            if (existingEntry) {
              result.skippedEntries++;
              result.details[record.officerName] = {
                success: false,
                message: `Entry already exists for court '${record.courtName}'`,
              };
              continue;
            }

            // Convert KPI values to the format expected by the system
            const values = Object.entries(record.kpiValues).map(
              ([name, value]) => ({
                name,
                value,
              })
            );

            // Create KPI entry with the specific court reference
            const kpiEntry = new KpiEntryModel({
              month,
              year,
              templateId,
              kpiRef: matchingCourtRef,
              values,
              status: 'generated', // Mark as generated since it's historical data
              totalScore: 0, // Will be calculated by validation
              createdBy: createdBy || 'system', // Set as system for CSV migration
              createdFor: member.userId,
            });

            // Validate and calculate scores
            const { KpiEntryValidation } = await import('./kpi_entry.model');
            const validatedValues =
              KpiEntryValidation.validateAndCalculateScores(template, values);

            kpiEntry.values = validatedValues;
            kpiEntry.totalScore = validatedValues.reduce(
              (sum, item) => sum + item.score,
              0
            );

            await kpiEntry.save();

            result.successfulEntries++;
            result.details[record.officerName] = {
              success: true,
              message: `Entry created successfully for court '${record.courtName}'`,
              entryId: kpiEntry._id.toString(),
            };

            logger.info(
              `Created KPI entry for ${record.officerName} (${record.courtName}): ${kpiEntry._id}`
            );
          } else {
            // Handle non-tehsildar data (existing logic)
            const member = await this.fetchMemberByName(record.officerName);

            if (!member) {
              result.skippedEntries++;
              result.details[record.officerName] = {
                success: false,
                message: 'Member not found',
              };
              continue;
            }

            // Check if entry already exists
            const existingEntry = await KpiEntryModel.findOne({
              createdFor: member.userId,
              month,
              year,
              templateId,
            });

            if (existingEntry) {
              result.skippedEntries++;
              result.details[record.officerName] = {
                success: false,
                message: 'Entry already exists',
              };
              continue;
            }

            // Convert KPI values to the format expected by the system
            const values = Object.entries(record.kpiValues).map(
              ([name, value]) => ({
                name,
                value,
              })
            );

            // Create KPI entry
            const kpiEntry = new KpiEntryModel({
              month,
              year,
              templateId,
              kpiRef: member.metadata?.kpiRef?.[0] || {
                label: 'area',
                value: 'raipur',
              },
              values,
              status: 'generated', // Mark as generated since it's historical data
              totalScore: 0, // Will be calculated by validation
              createdBy: createdBy || 'system', // Set as system for CSV migration
              createdFor: member.userId,
            });

            // Validate and calculate scores
            const { KpiEntryValidation } = await import('./kpi_entry.model');
            const validatedValues =
              KpiEntryValidation.validateAndCalculateScores(template, values);

            kpiEntry.values = validatedValues;
            kpiEntry.totalScore = validatedValues.reduce(
              (sum, item) => sum + item.score,
              0
            );

            await kpiEntry.save();

            result.successfulEntries++;
            result.details[record.officerName] = {
              success: true,
              message: 'Entry created successfully',
              entryId: kpiEntry._id.toString(),
            };

            logger.info(
              `Created KPI entry for ${record.officerName}: ${kpiEntry._id}`
            );
          }
        } catch (error) {
          result.failedEntries++;
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(
            `Error processing ${record.officerName}: ${errorMessage}`
          );
          result.details[record.officerName] = {
            success: false,
            message: errorMessage,
          };
          logger.error(
            `Error processing record for ${record.officerName}:`,
            error
          );
        }
      }

      logger.info(
        `Migration completed: ${result.successfulEntries} successful, ${result.failedEntries} failed, ${result.skippedEntries} skipped`
      );
      return result;
    } catch (error) {
      logger.error('Error in createKpiEntryFromCsvData:', error);
      throw error;
    }
  }

  /**
   * Migrate CSV data to KPI entries
   */
  static async migrateCsvData(
    csvContent: string,
    month: number,
    year: number,
    templateId: string,
    departmentSlug: string,
    role: string,
    createdBy: string
  ): Promise<MigrationResult> {
    try {
      logger.info(
        `Starting migration for month ${month}, year ${year}, template ${templateId}`
      );

      // Parse CSV data
      const csvData = this.parseCsvData(csvContent, departmentSlug, role);

      if (csvData.length === 0) {
        return {
          totalRecords: 0,
          successfulEntries: 0,
          failedEntries: 0,
          skippedEntries: 0,
          errors: ['No valid data found in CSV'],
          details: {},
        };
      }

      // Create KPI entries
      const result = await this.createKpiEntryFromCsvData(
        csvData,
        month,
        year,
        templateId,
        createdBy || 'system'
      );

      return result;
    } catch (error) {
      logger.error('Error in migrateCsvData:', error);
      throw error;
    }
  }
}
