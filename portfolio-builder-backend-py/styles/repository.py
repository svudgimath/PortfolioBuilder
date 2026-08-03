from bson import ObjectId
from bson.errors import InvalidId

from core.mongo import get_db


def _collection():
    return get_db()["styles"]


class StyleRepository:
    def find_active(self, portfolio_id: str):
        return _collection().find_one({"portfolioId": portfolio_id, "isActive": True})

    def find_all_by_portfolio(self, portfolio_id: str) -> list:
        return list(_collection().find({"portfolioId": portfolio_id}).sort("version", -1))

    def find_by_id(self, style_id: str):
        try:
            object_id = ObjectId(style_id)
        except (InvalidId, TypeError):
            return None
        return _collection().find_one({"_id": object_id})

    def save(self, doc: dict) -> dict:
        if doc.get("_id") is not None:
            _collection().replace_one({"_id": doc["_id"]}, doc)
        else:
            doc.pop("_id", None)
            result = _collection().insert_one(doc)
            doc["_id"] = result.inserted_id
        return doc

    def delete(self, doc: dict) -> None:
        _collection().delete_one({"_id": doc["_id"]})
