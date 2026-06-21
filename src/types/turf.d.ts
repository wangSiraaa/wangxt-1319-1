declare module '@turf/turf' {
  import * as Turf from '@turf/helpers';
  type Units =
    | 'meters'
    | 'millimeters'
    | 'centimeters'
    | 'kilometers'
    | 'acres'
    | 'miles'
    | 'nauticalmiles'
    | 'inches'
    | 'yards'
    | 'feet'
    | 'radians'
    | 'degrees'
    | 'hectares';
  export function point(
    coordinates: [number, number] | [number, number, number],
    properties?: { [key: string]: any },
    options?: { [key: string]: any },
  ): Turf.Feature<Turf.Point>;
  export function distance(
    from: Turf.Coord,
    to: Turf.Coord,
    options?: { units?: Units },
  ): number;
  export function length(
    geojson: Turf.Feature<Turf.LineString | Turf.MultiLineString> | Turf.LineString | Turf.MultiLineString,
    options?: { units?: Units },
  ): number;
  export function circle(
    center: Turf.Coord,
    radius: number,
    options?: {
      steps?: number;
      units?: Units;
      properties?: { [key: string]: any };
    },
  ): Turf.Feature<Turf.Polygon>;
  export function lineString(
    coordinates: Turf.Position[],
    properties?: { [key: string]: any },
    options?: { [key: string]: any },
  ): Turf.Feature<Turf.LineString>;
  export * from '@turf/helpers';
}
