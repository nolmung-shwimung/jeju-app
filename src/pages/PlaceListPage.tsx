// 예: src/pages/PlaceListPage.tsx
import { Link } from "react-router-dom";
import { PLACES } from "../data/places";

function PlaceListPage() {
  return (
    <div>
      {PLACES.map((place) => (
        <Link key={place.id} to={`/place/${place.id}`}>
          <div>{place.name}</div>
        </Link>
      ))}
    </div>
  );
}
