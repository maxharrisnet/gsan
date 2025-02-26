<!-- GPS Data Response! -->

```
const gpsData = {
  KITP00004171: [
    {
      timestamp: 1738186737,
      h3Id: '8527b2cffffffff',
      lat: 49.75466360745026,
      lon: -111.14731619428824
    }
  ],
  KITP00054403: [
    {
      timestamp: 1738186737,
      h3Id: '85121a67fffffff',
      lat: 55.04405674241909,
      lon: -120.97864848515401
    }
  ]
};
```

<!-- Starlink Modem Data Response -->
<!-- /v2.0/starlink/{id} -->

```
const starlinkModemData = {
  "type": "string",
  "meta": {
    "dishSerialNumber": "string",
    "kitSerialNumber": "string",
    "serviceLineNumber": "string",
    "userTerminalId": "string",
    "usageLimit": "string",
    "kit1": "string",
    "kit2": "string"
  },
  "id": "string",
  "data": {
    "latency": {
      "name": "string",
      "data": [
        [
          1685044800,
          51.5,
          0.2
        ]
      ]
    },
    "throughput": {
      "name": "string",
      "data": [
        [
          1685045100,
          0.059,
          0.353
        ]
      ]
    },
    "obstruction": {
      "name": "string",
      "data": [
        [
          1685046000,
          0.1
        ]
      ]
    },
    "signal": {
      "name": "string",
      "data": [
        [
          1685045100,
          100
        ]
      ]
    },
    "uptime": {
      "name": "string",
      "data": [
        [
          1685045400,
          1384223
        ]
      ]
    }
  },
  "usage": [
    {
      "date": "2025-01-29T21:47:43.897Z",
      "priority": 0,
      "unlimited": 0
    }
  ]
}
```

<!-- Starlink GPRS Data Response -->
<!-- /v2.0/starlinkgps -->

```
{
  "additionalProp1": [
    {
      "timestamp": 0,
      "h3Id": "string",
      "lat": 0,
      "lon": 0
    }
  ],
  "additionalProp2": [
    {
      "timestamp": 0,
      "h3Id": "string",
      "lat": 0,
      "lon": 0
    }
  ],
  "additionalProp3": [
    {
      "timestamp": 0,
      "h3Id": "string",
      "lat": 0,
      "lon": 0
    }
  ]
}
```
