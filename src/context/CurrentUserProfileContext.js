import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { addAuthStateListener, getCurrentUser } from "../services/supabaseAuth";
import { getAlumniPhotoFromStorage } from "../services/alumniQueries";

const CurrentUserProfileContext = createContext(null);

export const CurrentUserProfileProvider = ({ children }) => {
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  const refreshCurrentUserProfile = useCallback(async () => {
    try {
      const profile = await getCurrentUser();
      if (!profile) {
        setCurrentUserProfile(null);
        return null;
      }

      const livePhoto = await getAlumniPhotoFromStorage(profile.id).catch(
        () => null,
      );
      const resolvedProfile = {
        ...profile,
        alumni_photo: livePhoto ?? profile.alumni_photo ?? null,
      };

      setCurrentUserProfile(resolvedProfile);
      return resolvedProfile;
    } catch (error) {
      console.error(
        "[CurrentUserProfile] Refresh failed:",
        error?.message || error,
      );
      setCurrentUserProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshCurrentUserProfile();

    const unsubscribe = addAuthStateListener(async ({ user }) => {
      if (!user) {
        setCurrentUserProfile(null);
        return;
      }

      const livePhoto = await getAlumniPhotoFromStorage(user.id).catch(
        () => null,
      );
      setCurrentUserProfile({
        ...user,
        alumni_photo: livePhoto ?? user.alumni_photo ?? null,
      });
    });

    return unsubscribe;
  }, [refreshCurrentUserProfile]);

  const value = useMemo(
    () => ({
      currentUserProfile,
      setCurrentUserProfile,
      refreshCurrentUserProfile,
    }),
    [currentUserProfile, refreshCurrentUserProfile],
  );

  return (
    <CurrentUserProfileContext.Provider value={value}>
      {children}
    </CurrentUserProfileContext.Provider>
  );
};

export const useCurrentUserProfile = () => {
  const context = useContext(CurrentUserProfileContext);

  if (!context) {
    throw new Error(
      "useCurrentUserProfile must be used within CurrentUserProfileProvider",
    );
  }

  return context;
};
