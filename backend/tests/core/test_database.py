import pytest
from unittest.mock import patch
from app.core.database import get_db

def test_get_db():
    """
    Test that get_db yields a database session and closes it afterwards.
    """
    with patch("app.core.database.SessionLocal") as mock_session_local:
        mock_session = mock_session_local.return_value
        db_generator = get_db()
        
        # Yield the session
        db = next(db_generator)
        
        # Check that the yielded value is the mocked session
        assert db is mock_session
        
        # Check that the session is not closed yet
        mock_session.close.assert_not_called()
        
        # Exhaust the generator
        with pytest.raises(StopIteration):
            next(db_generator)
            
    # Check that the session is closed after the generator is exhausted
    mock_session.close.assert_called_once()