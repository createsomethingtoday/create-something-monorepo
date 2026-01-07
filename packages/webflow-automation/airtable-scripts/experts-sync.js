/**
 * Experts Sync to Mongo
 * 
 * Syncs Expert profiles from Airtable to Webflow's Mongo backend API.
 * 
 * TRIGGER: When record updated in Experts table
 * ENVIRONMENT: Production or Acceptance (via input variable)
 * 
 * INPUT VARIABLES:
 * - environment: 'production' | 'acceptance'
 * - recordID: Airtable record ID (from trigger)
 * - workspaceID: Workspace ID
 * - createdOn: Timestamp (determines POST vs PUT)
 * - useNewSystem: Boolean flag for new partner type system
 * 
 * API ENDPOINT: /api/v1/marketplace/profile
 * METHODS: POST (create), PUT (update)
 * 
 * FLOW:
 * 1. Determine environment and set API credentials
 * 2. Fetch expert record and related services
 * 3. Build payload based on method (POST/PUT)
 * 4. Make API call to Mongo
 * 5. Update Airtable record with response
 */

// Instantiate constants
let apiKey = `Bearer`;
const apiKeyAcceptance = 'S128Pt7AVFxjnCNySxAoH7iSK2rHu_PnXqcAzI1C93Q';
// OLD 'CIzflnKlbB8MzVblSORkCTsPbEhzEjlxpI1oEzoMxzvpUReijrTT24va8GuP76O';
const apiKeyProduction = 'z5PRD8X6TkEMrOmfLhQdz4wbT1VPEH4UfUINlFtqptQ';
// OLD '3HulTcJBjCa3NDWeU1WYGq9Np4rGRVezu4BKeMIiKYhp7vI0jij7Qs829Hmgxz03';
const baseURLAcceptance = 'https://webflowtest.com';
const baseURLProduction = 'https://webflow.com';
const endpoint = '/api/v1/marketplace/profile';
let requestURL = ``;
let requestMethod = '';

// Instantiate input variables
let inputConfig = input.config();

// Instantiate tables
let expertsTable = base.getTable(`tblD1iKe1AN8Scurm`); // Experts
let servicesTable = base.getTable(`tblMiwe7q1jV0gwE1`); // Services

console.log(expertsTable.fields);

// Set request variables based on environment
if(inputConfig.environment === 'production'){
  // Production
  apiKey = `${apiKey} ${apiKeyProduction}`;
  requestURL = `${baseURLProduction}${endpoint}`;
} else {
  // acceptance
  apiKey = `${apiKey} ${apiKeyAcceptance}`;
  requestURL = `${baseURLAcceptance}${endpoint}`;
}

// fetch the records
let expertRecord = await expertsTable.selectRecordAsync(inputConfig.recordID);
let servicesRecords = await servicesTable.selectRecordsAsync();

////////////////////////////
// ASSEMBLE THE PAYLOAD BODY
////////////////////////////
let payloadForEndpoint = {
  "workspaceId": inputConfig.workspaceID,
  "name": expertRecord.getCellValueAsString(`fldq8yeuXlOxOl6L1`), // UID
  expertsMetadata: {
    "airtableId": inputConfig.recordID,
    "expertSince": expertRecord.getCellValue(`fld7aKWlfC9HmA82j`) // 📅Created Date
  }
}

// Add fields that get sent in *both* POST and PUT
if(inputConfig.useNewSystem) {
  payloadForEndpoint[`expertsMetadata`][`partnerType`] = expertRecord.getCellValueAsString(`fldjpFkMSJmTV7GRq`); // 🥭Mongo partnerType?
} else {
  payloadForEndpoint[`expertsMetadata`][`expertType`] = expertRecord.getCellValueAsString(`fldF9JNc709zE31UB`).toUpperCase(); // ℹ️Expert Type; Optional
}

// Set request method using createdOn field 
if(!inputConfig.createdOn){
  // Path A: Create Expert Profile
  requestMethod = 'POST';
} else {
  // Path B: Update Expert Profile
  requestMethod = 'PUT';
  
  // Translate field values and append to payload 
  payloadForEndpoint[`bio`] = expertRecord.getCellValueAsString(`fld7A78vm34rQUyE0`); // Long Bio
  
  if(expertRecord.getCellValueAsString(`fldlVXpcQB6zY6CFp`)) {
    payloadForEndpoint[`businessType`] = expertRecord.getCellValueAsString(`fldlVXpcQB6zY6CFp`).toUpperCase(); // ℹ️Business Type
  }
  payloadForEndpoint[`city`] = expertRecord.getCellValueAsString(`fldz5quzpyEffMbpc`); // City
  payloadForEndpoint[`country`] = expertRecord.getCellValueAsString(`fldgJIEsL9FG75eAw`); // Country
  let featuredAssetType = expertRecord.getCellValueAsString(`fldn95Qx3TcVoSj55`); // 📸PH Featured Asset Type,
  // Only send featuredAssets when it's a cover photo OR MiW w/ a slug value
  if(featuredAssetType && (
      featuredAssetType === 'COVER_IMAGE' || 
      (featuredAssetType === 'MADE_IN_WEBFLOW' && expertRecord.getCellValueAsString(`fldTOHCjvW3Ang4Nr`))
    )
  ){
    payloadForEndpoint[`featuredAssets`] = [{
      "type": featuredAssetType,
      "slug": featuredAssetType === 'MADE_IN_WEBFLOW' ? expertRecord.getCellValueAsString(`fldTOHCjvW3Ang4Nr`): "", // 📸PH MiW Slug
      "coverImageMetadata": {
        "imageUrl": featuredAssetType === 'COVER_IMAGE' && expertRecord.getCellValue(`fldSJaNAAh1WsyfJ0`) && expertRecord.getCellValue(`fldSJaNAAh1WsyfJ0`).length > 0 ? expertRecord.getCellValue(`fldSJaNAAh1WsyfJ0`)[0][`url`]: "", // 📸PH Cover Photo Image
        'filename': featuredAssetType === 'COVER_IMAGE' && expertRecord.getCellValue(`fldSJaNAAh1WsyfJ0`) && expertRecord.getCellValue(`fldSJaNAAh1WsyfJ0`).length > 0 ? expertRecord.getCellValue(`fldSJaNAAh1WsyfJ0`)[0][`filename`]: "", // 📸PH Cover Photo Image
        "title": featuredAssetType === 'COVER_IMAGE' ? expertRecord.getCellValueAsString(`fldc8IJotng2nrzcp`): "", // 📸PH Cover Photo Title
        "websiteUrl": featuredAssetType === 'COVER_IMAGE' ? expertRecord.getCellValueAsString(`fldf7uZuLMde06R2t`): "", // 📸PH Cover Photo Link
      },
    }];
  }
  payloadForEndpoint[`inquiryEmailAddress`] = expertRecord.getCellValueAsString(`fldJqyIzhfPLJTs9G`); //📧Project Inquiry Email
  payloadForEndpoint[`languages`] = expertRecord.getCellValueAsString(`fldEDPXcdATvReQJK`).split(', '); // 🗣️Languages; Must be proper cased
  if(expertRecord.getCellValue(`fldjE1rnR2Znmnbgg`) && expertRecord.getCellValue(`fldjE1rnR2Znmnbgg`).length > 0) {
    payloadForEndpoint[`thumbnailImage`] = {
      'url': expertRecord.getCellValue(`fldjE1rnR2Znmnbgg`)[0][`url`], // Avatar
      'filename': expertRecord.getCellValue(`fldjE1rnR2Znmnbgg`)[0][`filename`], // Avatar
    }; 
  }
  payloadForEndpoint[`websiteUrl`] = expertRecord.getCellValueAsString(`fldpsT1v63Q4toPIN`); // Website

  // METADATA Fields
  if(expertRecord.getCellValue(`fldmvagmTiLKv2RbG`)) {
    payloadForEndpoint[`expertsMetadata`][`availabilityLastUpdated`] = expertRecord.getCellValue(`fldmvagmTiLKv2RbG`); // 📅Availability Last Updated
  }
  payloadForEndpoint[`expertsMetadata`][`availabilityStatus`] = expertRecord.getCellValueAsString(`fldrdJ3y5MhnKqlqn`); // 📅Availability Status 
  if(expertRecord.getCellValue(`fldhyo6V7QMKUjH74`) && expertRecord.getCellValue(`fldhyo6V7QMKUjH74`).length > 0) {
      payloadForEndpoint[`expertsMetadata`][`directoryImage`] = {
      "url": expertRecord.getCellValue(`fldhyo6V7QMKUjH74`)[0][`url`], // 🖼️Img #1   
      "filename": expertRecord.getCellValue(`fldhyo6V7QMKUjH74`)[0][`filename`]
    }
  }
  if(expertRecord.getCellValue(`fldF8jdnmnZbVjd8E`)) {
    payloadForEndpoint[`expertsMetadata`][`directoryTagline`] = expertRecord.getCellValue(`fldF8jdnmnZbVjd8E`); // ℹ️Bio (Short)
  }
  if(expertRecord.getCellValue(`fldARXQM7nMJZBpF9`)) {
    payloadForEndpoint[`expertsMetadata`][`hourlyDesignRate`] = {
      'value': expertRecord.getCellValue(`fldARXQM7nMJZBpF9`), // 💲Project Minimum
      'unit': 'USD',
    };
  }
  if(expertRecord.getCellValue(`fldgQwn1EhsAPcsVn`)) {
    payloadForEndpoint[`expertsMetadata`][`hourlyDevelopmentRate`] = {
      'value': expertRecord.getCellValue(`fldgQwn1EhsAPcsVn`), // 💲Project Minimum
      'unit': 'USD',
    };
  }
  if(expertRecord.getCellValueAsString(`fldVZe9tO1Iprb1Jo`)) {
    payloadForEndpoint[`expertsMetadata`][`industrySpecialties`] = expertRecord.getCellValueAsString(`fldVZe9tO1Iprb1Jo`).split(', '); // 🏭Industries; Must be proper cased
  } else {
    payloadForEndpoint[`expertsMetadata`][`industrySpecialties`] = []; // 🏭Industries; Must be proper cased
  }
  if(expertRecord.getCellValueAsString(`fldhUO8o1mkLQtq9t`)) {
    payloadForEndpoint[`expertsMetadata`][`lastAvailabilityResponse`] = expertRecord.getCellValueAsString(`fldhUO8o1mkLQtq9t`); // 🗓️Last Availability Response
  }
  if(expertRecord.getCellValueAsString(`fldwnX5xY9GvN1gTx`)) {
    payloadForEndpoint[`expertsMetadata`][`migratablePlatforms`] = expertRecord.getCellValueAsString(`fldwnX5xY9GvN1gTx`).split(', '); // ℹ️Platforms They Migrate From; Must be proper cased
  }
  if(expertRecord.getCellValueAsString(`fldEJmhfYDnSFh6uQ`)) {
    payloadForEndpoint[`expertsMetadata`][`partnerstackEmail`] = expertRecord.getCellValueAsString(`fldEJmhfYDnSFh6uQ`); //📧Partnerstack Email
  }
  payloadForEndpoint[`expertsMetadata`][`projectMinimum`] = {
    'value': expertRecord.getCellValue(`fldo6Io3fvaWErCbu`), // 💲Project Minimum
    'unit': 'USD',
  };
  if(expertRecord.getCellValueAsString(`fld9FIU7qOv8UT5b5`)) {
    payloadForEndpoint[`expertsMetadata`][`reviews`] = expertRecord.getCellValueAsString(`fld9FIU7qOv8UT5b5`);
  } else if(expertRecord.getCellValue(`fldjYLANLgHN5Zq7o`) === true) {
    // if 'remove all testimonials' checkbox is active, explicitly send `null` to Mongo to make it clear out testimonials
    payloadForEndpoint[`expertsMetadata`][`reviews`] = null;
  }
  // Services
  let services = new Array(); 
  let servicesField = expertRecord.getCellValue(`fld5EFoV74jImdOg9`); // 🛎️Services
  for(let service in servicesField){
    services.push({
      'name': servicesField[service].name,
      'type': servicesRecords.getRecord(
        servicesField[service].id 
      ).getCellValueAsString(`fld95S68P4p9rvgPb`).toUpperCase(), // Type
    })
  }
  payloadForEndpoint[`expertsMetadata`][`servicesOffered`] = services;
  if(expertRecord.getCellValueAsString(`fldCml9S56mfACk7M`) && expertRecord.getCellValueAsString(`fldCml9S56mfACk7M`) === 'Awaiting Profile') {
    // map "Awaiting Profile" to corresponding value in Mongo, which is "INACTIVE"
    payloadForEndpoint[`expertsMetadata`][`status`] = 'INACTIVE'
  } else {
    payloadForEndpoint[`expertsMetadata`][`status`] = expertRecord.getCellValueAsString(`fldCml9S56mfACk7M`).toUpperCase(); // 👀Expert Status
  }
  if(expertRecord.getCellValue(`fldbe1IHzpzOgYlMf`)) {
    payloadForEndpoint[`expertsMetadata`][`typicalProjectSize`] = {
      'value': expertRecord.getCellValue(`fldbe1IHzpzOgYlMf`), // 💲Project Minimum
      'unit': 'USD',
    };
  }
  if(expertRecord.getCellValue(`fldv9DQXv0R3MZRwX`)) {
    payloadForEndpoint[`expertsMetadata`][`unavailableUntilDate`] = expertRecord.getCellValue(`fldv9DQXv0R3MZRwX`).concat(`T00:00:00.000Z`); // 🗓️"Unavailable Until" Date
  }
}

console.log(payloadForEndpoint);

////////////////////
// API CALL TO MONGO
////////////////////

// Make call to Mongo
console.log('making call!');

try {
    let r = await fetch(requestURL, {
        method: requestMethod,
        body: JSON.stringify(payloadForEndpoint),
        headers: {
            'Content-Type': 'application/json',
            'authorization': apiKey // Note: Key ('authorization') must be lowercased
        },
    });

    // Handle response and parse JSON if possible
    let response;
    try {
        response = await r.json(); // Try parsing JSON response
    } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        response = {
            error: `Non-JSON response: ${await r.text()}`,
            status: r.status,
        };
    }

    console.log('Response:', response);

    // Instantiate payload for record
    let payloadForRecord = {
        'fld5bOMS6HLpPyvds': JSON.stringify(response), // 🥭Mongo Sync Response
        'fldsgf3WwTlocnNJx': (
            response.hasOwnProperty('code') ? // 🥭Mongo Sync Status
            {id: 'selUVHEHY6m9kIIEI'} : // ❗ Error
            {id: 'selYARr5AM1UO7uhW'} // ✅ Updated
        ),
    };

    // If successful, populate additional fields
    if (!response.hasOwnProperty('code') && r.ok) {
        payloadForRecord[`fldeRHn8R3nUqmXLb`] = response.updatedOn; // 🥭Mongo Last Updated
        if (requestMethod === 'POST') {
            payloadForRecord[`fldr8LY63os8wo0OQ`] = response.createdOn; // 🥭Mongo Created On
            payloadForRecord[`fldK5cr2ZG6JcQkPf`] = response.id;  // 🥭Mongo Profile ID
            payloadForRecord[`fldtyyo0RoVD4AgJ0`] = response.slug; // 🥭Mongo Profile Slug
        }
    }

    console.log('Payload for record:', payloadForRecord);

    // Update record in Airtable
    await expertsTable.updateRecordAsync(inputConfig.recordID, payloadForRecord);

} catch (error) {
    // Log fetch-related errors (e.g., network issues)
    console.error('Fetch error:', error);
}

