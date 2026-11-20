import AppKit
import MapKit
import Foundation

// One explicit saved-place lookup. No current-location or account access.
let input = FileHandle.standardInput.readDataToEndOfFile()
guard input.count < 4096,
      let request = try? JSONSerialization.jsonObject(with: input) as? [String: String],
      let query = request["query"], !query.isEmpty, query.count <= 500 else { exit(2) }
let searchRequest = MKLocalSearch.Request()
searchRequest.naturalLanguageQuery = query
var search: MKLocalSearch? = MKLocalSearch(request: searchRequest)
var snapshotter: MKMapSnapshotter?
DispatchQueue.main.asyncAfter(deadline: .now() + 28) { search?.cancel(); snapshotter?.cancel(); exit(3) }
search?.start { response, _ in
    guard let item = response?.mapItems.first else { exit(4) }
    let options = MKMapSnapshotter.Options()
    options.region = MKCoordinateRegion(center: item.placemark.coordinate, latitudinalMeters: 1400, longitudinalMeters: 1400)
    options.size = NSSize(width: 640, height: 320)
    options.mapType = .standard
    snapshotter = MKMapSnapshotter(options: options)
    snapshotter?.start { snapshot, _ in
        guard let snapshot = snapshot,
              let tiff = snapshot.image.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: tiff),
              let png = bitmap.representation(using: .png, properties: [:]), png.count <= 1_000_000,
              let output = try? JSONSerialization.data(withJSONObject: ["dataUrl": "data:image/png;base64," + png.base64EncodedString(), "matchedName": item.name ?? query, "verified": false]) else { exit(5) }
        FileHandle.standardOutput.write(output)
        exit(0)
    }
}
RunLoop.main.run()
