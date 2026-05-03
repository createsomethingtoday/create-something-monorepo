// Generated from RapidAPI MCP tools/list for linkedin-data-api.p.rapidapi.com.
// Do not edit by hand unless the upstream RapidAPI surface changes intentionally.

export const LINKEDIN_RAPIDAPI_TOOLS = [
  {
    name: 'Get_Profile_Connection__Follower_Count',
    description: 'Get Profile Connection & Follower Count',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/connection-count',
          description: 'Endpoint: GET /connection-count',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        username: {
          default: 'adamselipsky',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'Get_Company_Insights_PREMIUM',
    description:
      "Get Company Insight Details & Company Details in a single request. **5 credit per call.** If the request fails, you don't pay.",
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-company-insights',
          description: 'Endpoint: GET /get-company-insights',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        username: {
          default: 'amazon',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'Get_Company_Jobs',
    description: 'Get company jobs',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/company-jobs',
          description: 'Endpoint: POST /company-jobs',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'POST',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        companyIds: {
          items: {
            type: 'integer'
          },
          type: 'array'
        },
        page: {
          type: 'integer'
        }
      }
    }
  },
  {
    name: 'Get_Profile_Recent_Activity_Time',
    description: "Get the time of the profile's last activity",
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-profile-recent-activity-time',
          description: 'Endpoint: GET /get-profile-recent-activity-time',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        username: {
          default: 'adamselipsky',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'Get_Company_By_Domain',
    description: 'Enrich the company data by domain. **1 credit per successful request.**',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-company-by-domain',
          description: 'Endpoint: GET /get-company-by-domain',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        domain: {
          default: 'apple.com',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      },
      required: ['domain']
    }
  },
  {
    name: 'About_The_Profile',
    description:
      'Get profile verification details, profile’s joined, contact information updated, and profile photo updated date',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/about-this-profile',
          description: 'Endpoint: GET /about-this-profile',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        username: {
          default: 'williamhgates',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'Get_Profile_Post_Comment',
    description: 'Get 50 comments of a profile post  (activity)',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-profile-posts-comments',
          description: 'Endpoint: GET /get-profile-posts-comments',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        page: {
          default: '1',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        },
        paginationToken: {
          description:
            'It is required when fetching the next results page. The token from the previous call must be used.',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        sort: {
          default: 'mostRelevant',
          description: 'it could be one of these; mostRelevant, mostRecent',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        urn: {
          default: '7169084130104737792',
          description: 'Post urn value',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        }
      },
      required: ['sort', 'urn']
    }
  },
  {
    name: 'Get_Profile_Data_By_URL',
    description:
      'Get all profile data, including experience,  skills, language, education, course, and companies, **open to work** status, hiring status, location. Check **Example Responses** for more details',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-profile-data-by-url',
          description: 'Endpoint: GET /get-profile-data-by-url',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        url: {
          default: 'https://www.linkedin.com/in/adamselipsky/',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'Get_Article_Comments',
    description: 'Get article comments with url',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-article-comments',
          description: 'Endpoint: GET /get-article-comments',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        page: {
          default: '1',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        },
        sort: {
          default: 'REVERSE_CHRONOLOGICAL',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        },
        url: {
          default:
            'https://www.linkedin.com/pulse/2024-corporate-climate-pivot-bill-gates-u89mc/?trackingId=V85mkekwT9KruOXln2gzIg%3D%3D',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'Get_Profile_Post_and_Comments',
    description: 'Get profile post and comments of the post',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-profile-post-and-comments',
          description: 'Endpoint: GET /get-profile-post-and-comments',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        urn: {
          default: '7181285160586211328',
          description:
            'URN value of the post.\nExample URL: https://www.linkedin.com/posts/andy-jassy-8b1615_amazon-bedrock-customers-have-more-choice-activity-7181285160586211328-Idxl/?utm_source=share&utm_medium=member_desktop\nExample URN: 7181285160586211328',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        }
      },
      required: ['urn']
    }
  },
  {
    name: 'Get_Profiles_Posts',
    description: 'Get last 50 posts of a profile. 1 credit per call',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-profile-posts',
          description: 'Endpoint: GET /get-profile-posts',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        paginationToken: {
          description:
            'It is required when fetching the next results page. The token from the previous call must be used.',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        postedAt: {
          default: '',
          description:
            'It is not an official filter. It filters posts after fetching them from LinkedIn and returns posts that are newer than the given date.\nExample value: 2024-01-01 00:00',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        start: {
          description:
            'use this param to get posts in next results page: 0 for page 1, 50 for page 2 100 for page 3, etc.',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        username: {
          default: 'adamselipsky',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'Get_Company_Employees_Count',
    description: 'Get company employees count (location filter possible)',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-company-employees-count',
          description: 'Endpoint: POST /get-company-employees-count',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'POST',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        companyId: {
          example: '1441',
          type: 'string'
        },
        locations: {
          example: [],
          type: 'array'
        }
      }
    }
  },
  {
    name: 'Get_Company_Details_by_ID',
    description: 'The endpoint enrich full details of the company',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-company-details-by-id',
          description: 'Endpoint: GET /get-company-details-by-id',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        id: {
          default: '1441',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'Get_Profile_Positions_With_Skills',
    description: 'Get Profile Positions With Skills',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/profiles/position-skills',
          description: 'Endpoint: GET /profiles/position-skills',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        username: {
          default: 'tedgaubert',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'Get_Profile_Top_Voice_Interests',
    description: "Get the profile's top voices interests",
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/profiles/interests/top-voices',
          description: 'Endpoint: POST /profiles/interests/top-voices',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'POST',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        page: {
          type: 'integer'
        },
        username: {
          type: 'string'
        }
      }
    }
  },
  {
    name: 'Get_Post_Reactions',
    description: 'Get profiles that reacted to the post',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-post-reactions',
          description: 'Endpoint: POST /get-post-reactions',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'POST',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        page: {
          example: 1,
          type: 'number'
        },
        reactionType: {
          example: '',
          type: 'string'
        },
        urn: {
          example: '7196224250288955393',
          type: 'string'
        }
      }
    }
  },
  {
    name: 'Search_Jobs_V2',
    description: 'Search Jobs',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/search-jobs-v2',
          description: 'Endpoint: GET /search-jobs-v2',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        companyIds: {
          description:
            'please follow this [link](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api/tutorials/how-to-find-a-company-id-on-linkedin%3F) to find company id\n\n',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        datePosted: {
          default: 'anyTime',
          description: 'it could be one of these; anyTime, pastMonth, pastWeek, past24Hours',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        distance: {
          description: '0 = 0km\n\n5 = 8km\n\n10  = 16km\n\n25 = 40km\n\n50 = 80km\n\n100  = 160km',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        experienceLevel: {
          description:
            'it could be one of these; internship, associate, director, entryLevel, midSeniorLevel. executive\nexample: executive',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        functionIds: {
          description:
            'please follow this [link](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api/tutorials/how-to-find-a-function-id-on-linkedin%3F) to find function id\n\n',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        industryIds: {
          description:
            'please follow this [link](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api/tutorials/how-to-find-a-industry-id-on-linkedin%3F) to find industry id',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        jobType: {
          description:
            'it could be one of these; fullTime, partTime, contract, internship\nExample: contract',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        keywords: {
          default: 'golang',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        locationId: {
          default: '92000000',
          description:
            'please follow this [link](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api/tutorials/how-to-find-a-location-id-on-linkedin%3F) to find location id',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'number'
        },
        onsiteRemote: {
          description: 'it could be one of these;\n- onSite\n- remote\n- hybrid\n\nexample: remote',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        salary: {
          description:
            'it could be one of these; 40k+, 60k+, 80k+, 100k+, 120k+, 140k+, 160k+, 180k+, 200k+\nExample: 80k+',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        sort: {
          default: 'mostRelevant',
          description: 'it could be one of these; mostRelevant, mostRecent\n',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        start: {
          description:
            'it could be one of these; 0, 50, 100, 150, 200, etc.\nThe maximum number of start is 975',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        titleIds: {
          description:
            'please follow this [link](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api/tutorials/how-to-find-a-title-id-on-linkedin%3F) to find title id by title\n\n',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        }
      },
      required: ['keywords']
    }
  },
  {
    name: 'Get_Article_Reactions',
    description: 'Get article reactions with url',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-article-reactions',
          description: 'Endpoint: GET /get-article-reactions',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        page: {
          default: '1',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        },
        url: {
          default:
            'https://www.linkedin.com/pulse/2024-corporate-climate-pivot-bill-gates-u89mc/?trackingId=V85mkekwT9KruOXln2gzIg%3D%3D',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'Get_Post_Reposts',
    description: 'Get post reposts by post url',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/posts/reposts',
          description: 'Endpoint: POST /posts/reposts',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'POST',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        page: {
          example: 1,
          type: 'number'
        },
        paginationToken: {
          example: '',
          type: 'string'
        },
        urn: {
          example: '7245786832909557760',
          type: 'string'
        }
      }
    }
  },
  {
    name: 'Get_Profile_School_Interests',
    description: "Get the profile's school interests up to 50 results per page",
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/profiles/interests/schools',
          description: 'Endpoint: POST /profiles/interests/schools',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'POST',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        page: {
          type: 'integer'
        },
        username: {
          type: 'string'
        }
      }
    }
  },
  {
    name: 'Get_Profile_Company_Interest',
    description: "Get the profile's company interests up to 50 results per page.",
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/profiles/interests/companies',
          description: 'Endpoint: POST /profiles/interests/companies',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'POST',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        page: {
          type: 'integer'
        },
        username: {
          type: 'string'
        }
      }
    }
  },
  {
    name: 'Profile_Data__Recommendations',
    description: 'Get Profile Data, Given and Received Recommendations. **2 credits per call**',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/all-profile-data',
          description: 'Endpoint: GET /all-profile-data',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        username: {
          default: 'ryanroslansky',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'Get_Profile_Data_and_Connection__Follower_Count',
    description: 'Get Profile Data and Connection & Follower Count',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/data-connection-count',
          description: 'Endpoint: GET /data-connection-count',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        username: {
          default: 'adamselipsky',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'Get_Company_Post_Comments',
    description: 'Get comments of a company post',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-company-post-comments',
          description: 'Endpoint: GET /get-company-post-comments',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        page: {
          default: '1',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        },
        sort: {
          default: 'mostRelevant',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        },
        urn: {
          default: '7179144327430844416',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      },
      required: ['urn', 'sort']
    }
  },
  {
    name: 'Get_Job_Details',
    description: 'Get the full job details, including the job skills and the company information',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-job-details',
          description: 'Endpoint: GET /get-job-details',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        id: {
          default: '4090994054',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'integer'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'Get_Article',
    description: 'Get article with url',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-article',
          description: 'Endpoint: GET /get-article',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        url: {
          default: 'https://www.linkedin.com/pulse/hidden-costs-unreliable-electricity-bill-gates/',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'Health_Check',
    description: 'Health Check',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/health',
          description: 'Endpoint: GET /health',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        }
      }
    }
  },
  {
    name: 'Get_Profile_Newsletter_Interests',
    description: "Get the profile's newsletter interests up to 50 results per page",
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/profiles/interests/newsletters',
          description: 'Endpoint: POST /profiles/interests/newsletters',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'POST',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        page: {
          type: 'integer'
        },
        username: {
          type: 'string'
        }
      }
    }
  },
  {
    name: 'Get_Similar_Profiles',
    description: 'Returns profiles that are similar to the provided profile',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/similar-profiles',
          description: 'Endpoint: GET /similar-profiles',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        url: {
          default: 'https://www.linkedin.com/in/williamhgates/',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'Get_Received_Recommendations',
    description:
      'To scrape all recommendations from a profile, increase the start value to +100 for each request until you reach the total recommendations count. You can find the total recommendations count in the response',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-received-recommendations',
          description: 'Endpoint: GET /get-received-recommendations',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        start: {
          default: '0',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        },
        username: {
          default: 'ryanroslansky',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'Get_Profiles_Comments',
    description: 'Get last 50 comments of a profile. 1 credit per call',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-profile-comments',
          description: 'Endpoint: GET /get-profile-comments',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        username: {
          default: 'williamhgates',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'Search_People_by_URL',
    description:
      'Search profiles by a keyword.\nYou may see less than 10 results per page. This is because not return all profiles as public, sometimes hiding profiles and these profiles appear in the result. The endpoint automatically filters these profiles from the result',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/search-people-by-url',
          description: 'Endpoint: POST /search-people-by-url',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'POST',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        url: {
          example:
            'https://www.linkedin.com/search/results/people/?currentCompany=%5B%221035%22%5D&geoUrn=%5B%22103644278%22%5D&keywords=max&origin=FACETED_SEARCH&sid=%3AB5',
          type: 'string'
        }
      }
    }
  },
  {
    name: 'Get_Profile_Data',
    description: 'Enrich profile data, including experience,  skills, language and companies.',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/',
          description: 'Endpoint: GET /',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        username: {
          default: 'adamselipsky',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'Get_Profile_Group_Interests',
    description: "Get the profile's group interests up to 50 results per page",
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/profiles/interests/groups',
          description: 'Endpoint: POST /profiles/interests/groups',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'POST',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        page: {
          type: 'integer'
        },
        username: {
          type: 'string'
        }
      }
    }
  },
  {
    name: 'Get_User_Articles',
    description: 'Get user articles by profile with url or username',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-user-articles',
          description: 'Endpoint: GET /get-user-articles',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        url: {
          default: 'https://www.linkedin.com/in/williamhgates/',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        },
        username: {
          default: 'williamhgates',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      }
    }
  },
  {
    name: 'Get_Company_Details',
    description: 'The endpoint enrich full details of the company',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-company-details',
          description: 'Endpoint: GET /get-company-details',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        username: {
          default: 'google',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'Get_Given_Recommendations',
    description:
      'To scrape all recommendations from a profile, increase the start value to +100 for each request until you reach the total recommendations count. You can find the total recommendations count in the response',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-given-recommendations',
          description: 'Endpoint: GET /get-given-recommendations',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        start: {
          default: '0',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        },
        username: {
          default: 'ryanroslansky',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'Search_People',
    description:
      'Search profiles by a keyword.\nYou may see less than 10 results per page. This is because not return all profiles as public, sometimes hiding profiles and these profiles appear in the result. The endpoint automatically filters these profiles from the result',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/search-people',
          description: 'Endpoint: GET /search-people',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        company: {
          description: 'Company name',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        firstName: {
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        },
        geo: {
          default: '103644278,101165590',
          description:
            'please follow this [link](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-api8/tutorials/how-to-find-a-location-id-on-linkedin%3F) to find location id',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        keywordSchool: {
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        },
        keywordTitle: {
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        },
        keywords: {
          default: 'max',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        },
        lastName: {
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        },
        schoolId: {
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        },
        start: {
          default: '0',
          description: 'it could be one of these; 0, 10, 20, 30, etc.',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        }
      }
    }
  },
  {
    name: 'Get_Companys_Post',
    description: 'Get last 50 posts of a company. 1 credit per call',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-company-posts',
          description: 'Endpoint: GET /get-company-posts',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        paginationToken: {
          description:
            'It is required when fetching the next results page. The token from the previous call must be used.\n\n',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        start: {
          default: '0',
          description:
            'use this param to get posts in next results page: 0 for page 1, 50 for page 2, 100 for page 3, etc.',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        username: {
          default: 'microsoft',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'Get_Profiles_Posted_Jobs',
    description: "Get profile's posted jobs.",
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/profiles/posted-jobs',
          description: 'Endpoint: GET /profiles/posted-jobs',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        username: {
          default: 'jipeng-han',
          description: 'LinkedIn job id',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'Get_Post',
    description: 'Get post details',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-post',
          description: 'Endpoint: GET /get-post',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        page: {
          example: 1,
          type: 'number'
        },
        url: {
          example:
            'https://www.linkedin.com/posts/google_welcome-to-the-gemini-era-activity-7196224250288955393-hd08/?utm_source=share&utm_medium=member_desktop',
          type: 'string'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'Search_Jobs',
    description: 'Search Jobs',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/search-jobs',
          description: 'Endpoint: GET /search-jobs',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        companyIds: {
          description:
            'please follow this [link](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api/tutorials/how-to-find-a-company-id-on-linkedin%3F) to find company id\n\n',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        datePosted: {
          default: 'anyTime',
          description: 'it could be one of these; anyTime, pastMonth, pastWeek, past24Hours',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        experienceLevel: {
          description:
            'it could be one of these; internship, associate, director, entryLevel, midSeniorLevel. executive\nexample: executive',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        functionIds: {
          description:
            'please follow this [link](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api/tutorials/how-to-find-a-function-id-on-linkedin%3F) to find function id\n\n',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        industryIds: {
          description:
            'please follow this [link](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api/tutorials/how-to-find-a-industry-id-on-linkedin%3F) to find industry id',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        jobType: {
          description:
            'it could be one of these; fullTime, partTime, contract, internship\nExample: contract',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        keywords: {
          default: 'golang',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        locationId: {
          default: '92000000',
          description:
            'please follow this [link](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api/tutorials/how-to-find-a-location-id-on-linkedin%3F) to find location id',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'number'
        },
        onsiteRemote: {
          description: 'it could be one of these;\n- onSite\n- remote\n- hybrid\n\nexample: remote',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        salary: {
          description:
            'it could be one of these; 40k+, 60k+, 80k+, 100k+, 120k+, 140k+, 160k+, 180k+, 200k+\nExample: 80k+',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        sort: {
          default: 'mostRelevant',
          description: 'it could be one of these; mostRelevant, mostRecent\n',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        start: {
          description:
            'it could be one of these; 0, 25, 50, 75, 100, etc.\nThe maximum number of start is 975',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        titleIds: {
          description:
            'please follow this [link](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api/tutorials/how-to-find-a-title-id-on-linkedin%3F) to find title id by title\n\n',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        }
      },
      required: ['keywords']
    }
  },
  {
    name: 'Get_Hiring_Team',
    description:
      'Get hiring team/job poster profile details. You can use either a job id or a job URL. One of these is required.',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-hiring-team',
          description: 'Endpoint: GET /get-hiring-team',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        id: {
          default: '3903094332',
          description: 'LinkedIn job id',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        url: {
          default: 'https://www.linkedin.com/jobs/view/3903094332/',
          description: 'LinkedIn job url',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        }
      }
    }
  },
  {
    name: 'Get_Profile_Reactions',
    description: 'Find out what posts a profile reacted to',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-profile-likes',
          description: 'Endpoint: GET /get-profile-likes',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        paginationToken: {
          description:
            'It is required when fetching the next results page. The token from the previous call must be used.',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        start: {
          default: '0',
          description:
            'for pagination, increase +100 to parse next result until you see less than 100 results.\nit could be one of these; 0, 100, 200, 300, 400, etc.\n',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query',
          type: 'string'
        },
        username: {
          default: 'adamselipsky',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'Get_Profile_Top_Position',
    description: 'Get profile top position',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/profiles/positions/top',
          description: 'Endpoint: GET /profiles/positions/top',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        username: {
          default: 'adamselipsky',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'Get_Company_Pages_People_Also_Viewed',
    description: 'Get Company Pages People Also Viewed',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-company-pages-people-also-viewed',
          description: 'Endpoint: GET /get-company-pages-people-also-viewed',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        username: {
          default: 'google',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      }
    }
  },
  {
    name: 'Search_Posts',
    description: 'Search Posts',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/search-posts',
          description: 'Endpoint: POST /search-posts',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'POST',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        authorCompany: {
          items: {
            type: 'integer'
          },
          type: 'array'
        },
        authorIndustry: {
          items: {
            type: 'integer'
          },
          type: 'array'
        },
        authorTitle: {
          type: 'string'
        },
        contentType: {
          type: 'string'
        },
        datePosted: {
          type: 'string'
        },
        fromCompany: {
          items: {
            type: 'integer'
          },
          type: 'array'
        },
        fromMember: {
          items: {
            type: 'string'
          },
          type: 'array'
        },
        keyword: {
          type: 'string'
        },
        mentionsMember: {
          items: {
            type: 'string'
          },
          type: 'array'
        },
        mentionsOrganization: {
          items: {
            type: 'integer'
          },
          type: 'array'
        },
        page: {
          type: 'integer'
        },
        sortBy: {
          type: 'string'
        }
      }
    }
  },
  {
    name: 'Search_Companies',
    description: 'Search companies',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/companies/search',
          description: 'Endpoint: POST /companies/search',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'POST',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        externalDocs: {
          example: {
            description: 'Search companies payload references',
            url: 'https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api/tutorials/search-companies-payload-references'
          },
          type: 'object'
        }
      }
    }
  },
  {
    name: 'Search_Locations',
    description: 'Search locations by keyword',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/search-locations',
          description: 'Endpoint: GET /search-locations',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        keyword: {
          default: 'berlin',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      },
      required: ['keyword']
    }
  },
  {
    name: 'Search_Post_by_Hashtag',
    description: 'Search Post by Hashtag',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/search-posts-by-hashtag',
          description: 'Endpoint: POST /search-posts-by-hashtag',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'POST',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        hashtag: {
          example: 'golang',
          type: 'string'
        },
        paginationToken: {
          example: '',
          type: 'string'
        },
        sortBy: {
          example: 'REV_CHRON',
          type: 'string'
        },
        start: {
          example: '0',
          type: 'string'
        }
      }
    }
  },
  {
    name: 'Get_Company_Jobs_Count',
    description: 'Get total number of opening jobs the company',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/get-company-jobs-count',
          description: 'Endpoint: GET /get-company-jobs-count',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        companyId: {
          default: '1441',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      },
      required: ['companyId']
    }
  },
  {
    name: 'Get_Profile_Data_Connection__Follower_Count_and_Posts',
    description: 'Get Profile Data, Connection & Follower Count and Posts. 2 credits per call',
    inputSchema: {
      type: 'object',
      properties: {
        _endpoint: {
          default: '/profile-data-connection-count-posts',
          description: 'Endpoint: GET /profile-data-connection-count-posts',
          hidden: true,
          type: 'string'
        },
        _method: {
          default: 'GET',
          description: 'HTTP method',
          hidden: true,
          type: 'string'
        },
        username: {
          default: 'adamselipsky',
          externalDocs: {
            description: '',
            url: ''
          },
          in: 'query'
        }
      },
      required: ['username']
    }
  }
] as const;
