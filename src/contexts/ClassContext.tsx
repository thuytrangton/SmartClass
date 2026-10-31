import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ClassRoom } from '../types';
import { db } from '../services/db';

export const DEFAULT_SUBJECTS = [
  'Toán học',
  'Ngữ văn',
  'Tiếng Anh',
  'Vật lý',
  'Hóa học',
  'Sinh học',
  'Lịch sử',
  'Địa lý',
  'Tin học',
  'GDCD / KT-PL',
  'Công nghệ',
  'Giáo dục thể chất',
  'Âm nhạc',
  'Mỹ thuật'
];

interface ClassContextType {
  classes: ClassRoom[];
  selectedClassId: string;
  selectedClass: ClassRoom | undefined;
  setSelectedClassId: (id: string) => void;
  selectedSubject: string;
  setSelectedSubject: (subject: string) => void;
  allSubjects: string[];
  addSubject: (subject: string) => void;
  updateClassSubjects: (classId: string, subjects: string[]) => void;
  selectedSemester: 'HK1' | 'HK2';
  setSelectedSemester: (semester: 'HK1' | 'HK2') => void;
  refreshClasses: () => void;
}

const ClassContext = createContext<ClassContextType | undefined>(undefined);

export const ClassProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useState<ClassRoom[]>(() => db.getClasses());
  const [selectedClassId, setSelectedClassIdState] = useState<string>(() => {
    const saved = localStorage.getItem('smart_class_selected_class_id');
    return saved || 'cls-10a1';
  });

  const [selectedSubject, setSelectedSubjectState] = useState<string>(() => {
    const saved = localStorage.getItem('smart_class_selected_subject');
    return saved || 'Toán học';
  });

  const [allSubjects, setAllSubjects] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('smart_class_all_subjects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    // Collect from classes + default
    const set = new Set<string>(DEFAULT_SUBJECTS);
    db.getClasses().forEach((c) => {
      c.subjectNames?.forEach((s) => set.add(s));
    });
    return Array.from(set);
  });

  const [selectedSemester, setSelectedSemester] = useState<'HK1' | 'HK2'>('HK1');

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setClasses(db.getClasses());
    });
    return () => unsubscribe();
  }, []);

  const setSelectedClassId = (id: string) => {
    setSelectedClassIdState(id);
    localStorage.setItem('smart_class_selected_class_id', id);
  };

  const setSelectedSubject = (subject: string) => {
    const trimmed = subject.trim();
    if (!trimmed) return;
    setSelectedSubjectState(trimmed);
    localStorage.setItem('smart_class_selected_subject', trimmed);
    if (!allSubjects.includes(trimmed)) {
      const next = [...allSubjects, trimmed];
      setAllSubjects(next);
      localStorage.setItem('smart_class_all_subjects', JSON.stringify(next));
    }
  };

  const addSubject = (newSubject: string) => {
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    if (!allSubjects.includes(trimmed)) {
      const next = [...allSubjects, trimmed];
      setAllSubjects(next);
      localStorage.setItem('smart_class_all_subjects', JSON.stringify(next));
    }
    setSelectedSubject(trimmed);
  };

  const updateClassSubjects = (classId: string, subjects: string[]) => {
    db.updateClass(classId, { subjectNames: subjects });
    // Also merge into allSubjects
    const set = new Set<string>(allSubjects);
    subjects.forEach((s) => set.add(s));
    const next = Array.from(set);
    setAllSubjects(next);
    localStorage.setItem('smart_class_all_subjects', JSON.stringify(next));
    setClasses(db.getClasses());
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  const refreshClasses = () => {
    setClasses(db.getClasses());
  };

  return (
    <ClassContext.Provider
      value={{
        classes,
        selectedClassId,
        selectedClass,
        setSelectedClassId,
        selectedSubject,
        setSelectedSubject,
        allSubjects,
        addSubject,
        updateClassSubjects,
        selectedSemester,
        setSelectedSemester,
        refreshClasses
      }}
    >
      {children}
    </ClassContext.Provider>
  );
};

export const useClass = () => {
  const context = useContext(ClassContext);
  if (!context) throw new Error('useClass must be used within ClassProvider');
  return context;
};
