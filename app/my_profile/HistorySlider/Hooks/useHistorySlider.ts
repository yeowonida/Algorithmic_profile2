import { useState, useEffect } from "react";
import { 
  HistoryData, 
  ImageData
} from '../../../types/profile';
import { getSliderHistory } from "@/app/utils/get/getSliderHistory";
import { getLatestProfileData } from "@/app/utils/get/getProfileData";
import { getUserData } from "@/app/utils/get/getUserData";

export function useHistorySlider({
    originalImage: initialOriginalImage,
    positions,
    frameStyles,
    setPositions,
    setFrameStyles,
    setVisibleImageIds,
    setImages,
    placeholderImage,
    onHistoryBgColorChange,
    originalBgColor,
    changeProfile,
}: {
    originalImage: ImageData[];
    positions: Record<string, {x: number, y: number}>;
    frameStyles: Record<string, string>;
    setPositions: (positions: Record<string, {x: number, y: number}>) => void;
    setFrameStyles: (frameStyles: Record<string, string>) => void;
    setVisibleImageIds: (ids: Set<string>) => void;
    setImages: (images: ImageData[]) => void;
    placeholderImage: string;
    onHistoryBgColorChange?: (color: string) => void;
    originalBgColor: string;
    changeProfile: (nickname: string, description: string) => void;
}) {
    const [histories, setHistories] = useState<HistoryData[]>([]);
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [originalImage, setOriginalImage] = useState<ImageData[]>(initialOriginalImage);

    // 히스토리 불러오기 (페이지 첫 로드 시)
    useEffect(() => {
        const loadSliderHistory = async () => {
            try {
                setCurrentHistoryIndex(-1); // 파란 점을 활성화

                // 1. SliderHistory (검은 점들)를 불러옵니다.
                const SliderHistory = await getSliderHistory();
                if (SliderHistory && Array.isArray(SliderHistory)) {
                    const migratedHistories = SliderHistory.map((history: any) => ({
                        ...history,
                        images: history.images || originalImage // images는 props로 받은 초기 이미지
                    }));
                    setHistories(migratedHistories);
                } else {
                    console.log('SliderHistory가 배열이 아니거나 없습니다:', SliderHistory);
                    setHistories([]);
                }
            } catch (e) {
                console.error("SliderHistory 로드 에러:", e);
                setHistories([]);
            }
        };

        loadSliderHistory();
    }, []);

    useEffect(() => {
        setImages(originalImage);
        setOriginalImage(originalImage); // 최초 한 번만!
    }, []);   

    // 히스토리 재생 효과
    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (isPlaying && histories.length > 0) {
        intervalId = setInterval(() => {
            setCurrentHistoryIndex(prev => {
            const nextIndex = prev + 1;
            if (nextIndex >= histories.length) {
                setIsPlaying(false);
                
                // 파란색 점 (profileImages) 상태 로드 및 설정
                const profileImagesData = localStorage.getItem('profileImages');
                if (profileImagesData) {
                    try {
                        const parsedProfileImages = JSON.parse(profileImagesData);
                        let imageArrayToProcess: ImageData[];
                        if (Array.isArray(parsedProfileImages)) {
                            imageArrayToProcess = parsedProfileImages;
                        } else {
                            imageArrayToProcess = Object.values(parsedProfileImages) as ImageData[];
                        }

                        const processedImagesForBlueDot: ImageData[] = [];
                        const newPositionsForBlueDot: Record<string, {x: number, y: number}> = {};
                        const newFrameStylesForBlueDot: Record<string, string> = {};

                        imageArrayToProcess.forEach((img) => {
                            const moodboardImage: ImageData = {
                                ...img, // ImportedImageData의 모든 속성 복사
                                id: img.id || `fallback_id_${Math.random().toString(36).substr(2, 9)}`, // id는 필수, 없으면 임의 생성
                                src: img.src || placeholderImage,
                                main_keyword: img.main_keyword || '',
                                keywords: img.keywords || [],
                                mood_keyword: img.mood_keyword || '',
                                description: img.description || '',
                                category: img.category || '',
                                sizeWeight: img.sizeWeight || 0,
                                relatedVideos: img.relatedVideos || [],
                                desired_self: img.desired_self || false,
                                desired_self_profile: img.desired_self_profile || null,
                                metadata: img.metadata || {},
                                rotate: img.rotate || 0,
                                width: img.width || 0,
                                height: img.height || 0,
                                left: img.left || '0px',
                                top: img.top || '0px',
                                position: img.position || { x: Number(img.left?.replace('px', '') || 0), y: Number(img.top?.replace('px', '') || 0) },
                                frameStyle: img.frameStyle || 'normal',
                                
                                user_id: img.user_id || '',
                                created_at: img.created_at || new Date().toISOString(),
                            };
                            processedImagesForBlueDot.push(moodboardImage);

                            if (moodboardImage.id) {
                                newFrameStylesForBlueDot[moodboardImage.id] = moodboardImage.frameStyle;
                                newPositionsForBlueDot[moodboardImage.id] = moodboardImage.position;
                            }
                        });
                        
                        setImages(processedImagesForBlueDot);
                        setPositions(newPositionsForBlueDot);
                        setFrameStyles(newFrameStylesForBlueDot);
                        setVisibleImageIds(new Set<string>(processedImagesForBlueDot.map(pImg => pImg.id).filter(id => id)));
                        console.log('🔵 Playback: Switched to ProfileImages (blue dot) state');
                    } catch (error) {
                        console.error('🔵 Playback: Failed to load or process profileImages for blue dot:', error);
                    }
                } else {
                    console.warn('🔵 Playback: No profileImages found in localStorage for blue dot.');
                }
                return -1; // 파란색 점으로 인덱스 설정
            }
            // 기존 히스토리(검은색 점) 재생 로직
            const nextHistoryImageIds = new Set<string>(histories[nextIndex].images.map((img: any) => img.id));
            setVisibleImageIds(nextHistoryImageIds);
            setImages(histories[nextIndex].images);
            const positionsFromImages: Record<string, {x: number, y: number}> = {};
            histories[nextIndex].images.forEach((img: any) => {
                if (img.id && img.position) {
                    positionsFromImages[img.id] = img.position;
                }
            });
            setPositions(positionsFromImages);
            setFrameStyles(histories[nextIndex].frameStyles || {});
            return nextIndex;
            });
        }, 2000);
        }
        return () => {
        if (intervalId) clearInterval(intervalId);
        };
    }, [isPlaying, histories, setPositions, setFrameStyles, setVisibleImageIds, setImages, placeholderImage]);

    // 히스토리 클릭 핸들러
    const handleHistoryClick = (index: number, originalImage: any[]) => {
        console.log(`🕐 === 히스토리 ${index} 클릭 ===`);
        
        // -1은 원본 ProfileImages 상태를 의미
        if (index === -1) {
            // 1. 프로필/유저 데이터 최신화 (이미지 상태는 건드리지 않음!)
            const loadProfileAndUserData = async () => {
                try {
                    // 프로필 데이터 로드
                    const latestProfile = await getLatestProfileData();
                    if (latestProfile) {
                        const profileData = {
                            nickname: latestProfile.nickname || '',
                            description: latestProfile.main_description || ''
                        };
                        if (typeof changeProfile === 'function') changeProfile(profileData.nickname, profileData.description);
                    } else {
                        if (typeof changeProfile === 'function') changeProfile('', '');
                    }

                    // 유저 데이터(배경색 등) 로드
                    const userData = await getUserData();
                    if (userData?.background_color) {
                        if (typeof onHistoryBgColorChange === 'function') onHistoryBgColorChange(userData.background_color);
                    } else {
                        if (typeof onHistoryBgColorChange === 'function') onHistoryBgColorChange('#000000');
                    }
                } catch (error) {
                    if (typeof changeProfile === 'function') changeProfile('', '');
                    if (typeof onHistoryBgColorChange === 'function') onHistoryBgColorChange('#000000');
                }
            };
            loadProfileAndUserData();

            // 2. 이미지/포지션 등 복원 (setImages만 사용, setOriginalImages는 절대 호출하지 않음!)
            console.log('🔵originalImage', originalImage);
            setCurrentHistoryIndex(-1);
            const safeOriginalImage = (originalImage ?? []).map(img => ({ ...img }));
            const selectedHistoryImageIds = new Set<string>(safeOriginalImage.map(pImg => pImg.id).filter(id => id));
            setVisibleImageIds(selectedHistoryImageIds);

            setImages(safeOriginalImage); // 원본 복원
            const positionsFromImages: Record<string, {x: number, y: number}> = {};
            safeOriginalImage.forEach((img: any) => {
                if (img.id && img.position) {
                    positionsFromImages[img.id] = img.position;
                }
            });
            setPositions(positionsFromImages);
            setFrameStyles(frameStyles);
            return;
        }
        // index가 -1이 아닐 때, 해당 히스토리의 배경색을 적용
        if (onHistoryBgColorChange) onHistoryBgColorChange('#858585'); // 기본값
            const selectedHistory = histories[index];

        console.log('🔵selectedHistory',selectedHistory); 

        
        //console.log('선택된 히스토리:', selectedHistory);
        //console.log('히스토리의 이미지 개수:', selectedHistory.images.length);
        
        const selectedHistoryImageIds = new Set<string>(selectedHistory.images.map((img: any) => img.id));
        //console.log('히스토리의 이미지 ID들:', Array.from(selectedHistoryImageIds));
        
        setVisibleImageIds(selectedHistoryImageIds);
        setCurrentHistoryIndex(index);
        
        // 해당 히스토리의 이미지 데이터로 업데이트 (position 포함)
       // console.log('🖼️ 이미지 데이터 업데이트 중...');
        setImages(selectedHistory.images);
        
        // 이미지 내부의 position에서 positions 객체 생성 (호환성을 위해)
        const positionsFromImages: Record<string, {x: number, y: number}> = {};
        const frameStylesFromImages: Record<string, string> = {}; // frameStyles 추출용 객체
        selectedHistory.images.forEach((img: any) => {
            if (img.id) {
                frameStylesFromImages[img.id] = img.frameStyle || 'healing';
                //console.log('🎨 최종 frameStyles:', frameStylesFromImages); // 추출된 frameStyles 로그
            }
            if (img.id && img.position) {
                positionsFromImages[img.id] = img.position;
                //console.log(`📍 이미지 ${img.id} 위치:`, img.position);
            } else {
                console.log(`❌ 이미지 ${img.id}에 position 없음`);
            }
        });
        
        //console.log('📍 최종 positions:', positionsFromImages);
        setPositions(positionsFromImages);
        setFrameStyles(selectedHistory.frameStyles || {});
        //console.log('✅ 히스토리 로드 완료');
    };

    // 히스토리 재생 시작 핸들러
    const handlePlayHistory = () => {
        if (histories.length > 0) {
        const firstHistoryImageIds = new Set<string>(histories[0].images.map((img: any) => img.id));
        setVisibleImageIds(firstHistoryImageIds);
        setCurrentHistoryIndex(0);
        
        // 첫 번째 히스토리의 이미지 데이터로 업데이트 (position 포함)
        setImages(histories[0].images);
        
        // 이미지 내부의 position에서 positions 객체 생성 (호환성을 위해)
        const positionsFromImages: Record<string, {x: number, y: number}> = {};
        histories[0].images.forEach((img: any) => {
            if (img.id && img.position) {
                positionsFromImages[img.id] = img.position;
            }
        });
        
        setPositions(positionsFromImages);
        setFrameStyles(histories[0].frameStyles || {});
        setIsPlaying(true);
        }
    };

    return {
        histories,
        setHistories,
        currentHistoryIndex,
        setCurrentHistoryIndex,
        isPlaying,
        setIsPlaying,
        handleHistoryClick,
        handlePlayHistory,
    };
} 