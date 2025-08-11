import React, { useState, useEffect } from 'react';
import { useDraggableImage } from './Hooks/Drag/useDraggableImage';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { RefreshCw, AlertTriangle, Trash2 } from 'lucide-react';

//refactoring
import ClusterDetailPanel from "../Modal/ClusterDetailPanel";
import ImageResearchModal from "../Edit/ImageRe-searchModal";
import { useImageSearch } from "../Edit/Hooks/Image/useImageResearch_naver";
import { useImageFrame } from "./Hooks/Frame/useImageFrame";

// YouTube IFrame API 타입 선언 (TS 에러 방지)
declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: (() => void) | undefined;
    }
}

// VideoData 타입 추가
export type VideoData = {
    title: string;
    embedId: string;
};
// DraggableImageProps 타입 정의 (필요에 따라 수정)
export interface DraggableImageProps {
    image: any;
    position?: { x: number; y: number };
    isEditing: boolean;
    frameStyle: string;
    onFrameStyleChange: (id: string, style: string) => void;
    onImageChange: (id: string, src: string, keyword: string) => void;
    onImageSelect: (image: any) => void;
    isSelected: boolean;
    isSearchMode: boolean;
    onImageDelete: (id: string) => void;
    isOwner?: boolean;
    ownerId?: string;
    profile: any;
}

// 모양별 정보 배열
const frameOptions = [
  { value: 'normal', icon: '⬛️', label: '나의 기본 관심사' },
  //{ value: 'inspiration', icon: '⬡', label: '영감을 주는 영상' },
  //{ value: 'people', icon: '⚪️', label: '내가 좋아하는 사람' },
    //{ value: 'interest', icon: '🔶', label: '나만의 관심사' },
  //{ value: 'cloud', icon: '🌥️', label: '클라우드' },
  //{ value: 'heart', icon: '💖', label: '하트' },
  //{ value: 'pentagon', icon: '🔺', label: '펜타곤' },
  //{ value: 'star', icon: '⭐️', label: '별' },
  { value: 'pill', icon: '💊', label: '나에게 힐링이 되는 영상' },
  //{ value: 'cokie', icon: '🍪', label: '쿠키' },
];

const DraggableImage: React.FC<DraggableImageProps> = ({ 
    image, 
    position, 
    isEditing,
    frameStyle,
    onFrameStyleChange,
    onImageChange,
    onImageSelect,
    isSelected,
    isSearchMode,
    isOwner = true,
    ownerId,
    onImageDelete,
    profile,
}) => {
    const { attributes, listeners, setNodeRef, style } = useDraggableImage(
        image.id,
        isEditing,
        position,
        image.rotate
    );

    const [imageLoadError, setImageLoadError] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [showThumbnailModal, setShowThumbnailModal] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('search');
    const [showDeleteTooltip, setShowDeleteTooltip] = useState(false);

    // desired_self 여부에 따라 실제 크기 조절에 사용될 가중치 계산
    const safeSizeWeight = Number(image.sizeWeight) || 1;
    const effectiveSizeWeight = image.desired_self ? safeSizeWeight : safeSizeWeight * 10;

    // effectiveSizeWeight를 기반으로 폰트 크기 계산
    const minFontSize = 10;
    const maxFontSize = 30;
    // effectiveSizeWeight의 예상 범위
    const minWeight = 0.15;
    const maxWeight = 1.5;

    const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);
    
    // 가중치를 제한하고 0-1 범위로 정규화
    const clampedWeight = clamp(effectiveSizeWeight, minWeight, maxWeight);
    const normalizedRatio = (clampedWeight - minWeight) / (maxWeight - minWeight);

    // 제곱근을 사용하여 작은 값의 차이를 증폭
    const curvedRatio = Math.sqrt(normalizedRatio);
    
    const fontSize = minFontSize + curvedRatio * (maxFontSize - minFontSize);

    useEffect(() => {
        // src가 없거나 logo.png를 포함하는 경우, 유효하지 않은 것으로 간주합니다.
        const isInvalid = !image.src || image.src.includes('/images/logo.png');
        if (isInvalid) {
            const target = document.getElementById(image.id) as HTMLImageElement;
            if (target) {
                target.src = '/images/default_image.png';
            }
            setImageLoadError(true); // 이미지 로드 에러 상태 설정
        }
        // 이 효과는 이미지 소스가 바뀔 때마다 실행됩니다.
    }, [image.src, image.id, onImageChange]);

    const {
        alternativeImages,
        isLoadingImages,
        isLoadingMore,
        hasMore,
        fetchAlternativeImages,
        loadMoreImages,
        handleImageSelect,
        setAlternativeImages,
    } = useImageSearch(image, showImageModal, onImageChange, setShowImageModal);

    const {
        frameStyle: updatedFrameStyle,
        getClipPath,
        getFrameStyle,
        handleFrameStyleChange,
    } = useImageFrame(frameStyle, image, onFrameStyleChange);

    // 버튼에서 직접 string 값을 넘길 수 있도록 래핑
    const handleFrameStyleChangeByValue = (value: string) => {
        // select 이벤트 mock 객체 생성
        handleFrameStyleChange({ target: { value } } as React.ChangeEvent<HTMLSelectElement>);
    };

    return (
    <>
        {/* 이미지 띄우기 */}
        <Sheet>
            <div
                ref={setNodeRef}
                data-id={image.id}
                style={{
                ...style,
                position: 'absolute',
                width: Math.max((Number(image.width) || 200) * (image.desired_self ? (Number(image.sizeWeight) || 1) : (Number(image.sizeWeight) || 1) * 10), 50),
                height: Math.max(((Number(image.height) || 200) + 80) * (image.desired_self ? (Number(image.sizeWeight) || 1): (Number(image.sizeWeight) || 1) * 10), 50),
                touchAction: 'none',
                zIndex: isSelected ? 30 : 10,
                transition: isEditing ? 'none' : 'transform 0.8s ease-in-out',
                }}
                className={`group ${isEditing ? "cursor-move" : isSearchMode ? "cursor-pointer" : ""}`}
            >
                {/* 이미지 묶음 */}
                <div className={`absolute inset-0  ${!isEditing && isSearchMode ? 'transition-all duration-300 hover:scale-110 hover:z-30' : ''} ${isEditing ? 'pointer-events-none' : ''}`}
                >
                    {/* 메인키워드 */}
                    <div 
                        className={`${image.desired_self ? 'text-center' : 'absolute top-1 ml-2 z-20 whitespace-nowrap'}`}
                        style={{
                        fontSize: `${fontSize}px`,
                        }}
                    >
                        <div className="group relative y-2">
                            <span className={`font-semibold ${image.desired_self ? 'text-purple-600' : 'text-white'}`}>
                                #{image.main_keyword}
                            </span>
                            {/* 호버 툴팁 
                            {!isEditing && (
                            <div
                            className="fixed z-[9999] left-1/2 bottom-1/2 -translate-x-1/2 -translate-y-1/2 
                                        bg-white text-gray-800 px-6 py-3 rounded-2xl shadow-lg text-sm font-medium 
                                        whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none
                                        after:content-[''] after:absolute after:left-1/2 after:bottom-0 after:-translate-x-1/2 after:translate-y-full 
                                        after:border-8 after:border-x-transparent after:border-t-white after:border-b-0
                                        text-center
                                        "
                            >
                            이미지를 클릭해 <br/>알고리즘 설명을 확인해보세요!
                            </div>
                            
                            )}
                            */}
                        </div>
                        
                    </div>

                    {/* 이미지 */}
                    <SheetTrigger asChild>
                        
                        <div 
                        className={`group relative w-full h-[calc(100%-40px)] ${updatedFrameStyle === 'people' ? 'overflow-hidden' : ''} ${!isEditing && !isSearchMode ? 'cursor-pointer' : ''} ${isEditing ? 'pointer-events-none' : ''}`}
                        >
                        <div
                            style={{
                            
                            }}
                            className={`group hover:scale-105 transition-transform duration-300 relative w-full h-full ${getFrameStyle()} overflow-hidden ${
                                isSelected ? 'ring-2 ring-white ring-opacity-70 shadow-xl' : ''
                            }`}
                        >
                            {/* 🔽 그라디언트 오버레이 추가 */}
                            {!image.desired_self && <div className="absolute top-0 left-0 w-full h-1/5 bg-gradient-to-b from-black/90 to-transparent z-10 pointer-events-none" />}
                            
                            <img
                                src={imageLoadError ? "/images/default_image.png" : image.src}
                                alt={image.main_keyword}
                                className={`group w-full h-full object-cover shadow-xl transition-transform duration-300 
                                    ${!isEditing && isSearchMode ? 'group-hover:scale-105' : ''}
                                    ${image.desired_self ? 'rounded-full' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isEditing && isSearchMode) {
                                        onImageSelect(image);
                                    } else if (!isEditing && !isSearchMode) {
                                        setShowDetails(true);
                                    }
                                }}
                                onError={() => setImageLoadError(true)}
                            />
                            {/* 호버 툴팁 
                            <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white text-black px-6 py-3 rounded-2xl shadow-lg text-base font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none after:content-[''] after:absolute after:left-full after:top-1/2 after:-translate-y-1/2 after:border-8 after:border-y-transparent after:border-l-white after:border-r-transparent after:ml-[-1px]" style={{zIndex: 9999}}>
                                이미지를 클릭해 알고리즘 설명을 확인해보세요!
                            </div>
                            */}
                        </div>
                        
                        
                        
                        </div>
                    </SheetTrigger>
                </div>
                
                {/* 편집 모드-이미지 변경하기*/}
                {isEditing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {image.desired_self ? (
                    <button 
                        className="mb-10 z-[70] group flex items-center justify-center gap-1.5 py-2 px-4 bg-red-500/90 text-white 
                        backdrop-blur-sm rounded-full hover:bg-red-600 shadow-sm transition-colors pointer-events-auto relative"
                        onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // 실제 삭제 기능 실행
                        if (window.confirm('정말로 이 관심사를 삭제하시겠습니까?')) {
                            onImageDelete(image.id);
                        }
                        }}
                        onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        }}
                    >
                        {/* 호버 툴팁 */}
                        <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white text-black px-6 py-3 rounded-2xl shadow-lg text-base font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none after:content-[''] after:absolute after:left-full after:top-1/2 after:-translate-y-1/2 after:border-8 after:border-y-transparent after:border-l-white after:border-r-transparent after:ml-[-1px]" style={{zIndex: 9999}}>
                            가져온 관심사는 삭제 가능해요
                        </div>
                        <Trash2 className="h-4 w-4" />
                    </button>
                    ) : (
                    <button 
                        className="z-[60] group flex mb-10 items-center justify-center py-2 px-4 backdrop-blur-sm rounded-full 
                        hover:bg-white shadow-lg transition-all hover:scale-105 pointer-events-auto relative"
                        onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        }}
                    >
                        {/* 호버 툴팁 */}
                        <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white text-black px-6 py-3 rounded-2xl shadow-lg text-base font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none after:content-[''] after:absolute after:left-full after:top-1/2 after:-translate-y-1/2 after:border-8 after:border-y-transparent after:border-l-white after:border-r-transparent after:ml-[-1px]" style={{zIndex: 9999}}>
                            이미지를 변경해보세요!
                        </div>
                        <RefreshCw 
                            className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300 cursor-pointer" 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowImageModal(true);
                            }}
                        />
                    </button>
                    )}
                </div>
                )}
                {/* 편집 모드-프레임 변경하기
                {isEditing && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 z-40 pointer-events-auto flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {!image.desired_self && (
                        <>
                        {frameOptions
                            .filter(opt => opt.value !== 'cokie') // cokie 옵션을 일반 이미지에서 제외
                            .map(opt => (
                            <button
                                key={opt.value}
                                className={`rounded-full text-sm px-2 py-1  rounded-full hover:bg-white shadow-lg transition-all hover:scale-105 z-20 pointer-events-auto 
                                    ${updatedFrameStyle === opt.value ? 'border-blue-400' : 'border-transparent'}`}
                                onClick={() => {
                                    handleFrameStyleChangeByValue(opt.value);
                                    onFrameStyleChange(image.id, opt.value);
                                }}
                                onMouseDown={e => e.stopPropagation()}
                                title={opt.label}
                                type="button"
                            >
                                <span>{opt.icon}</span>
                            </button>
                        ))}
                        </>
                    )}
                    
                </div>
                )}
                */}
                
                {/* 편집 모드-드래그 가능한 영역*/}
                {isEditing && (
                <div
                    className="absolute inset-0 z-50"
                    {...listeners}
                    {...attributes}
                />
                )}
            </div>
        </Sheet>

        {/* 이미지 새로 검색하기 모달 */}
        <ImageResearchModal
            open={showImageModal}
            onOpenChange={setShowImageModal}
            image={image}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isLoadingImages={isLoadingImages}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            alternativeImages={alternativeImages}
            fetchAlternativeImages={fetchAlternativeImages}
            loadMoreImages={loadMoreImages}
            handleImageSelect={handleImageSelect}
            onImageChange={onImageChange}   
            setShowThumbnailModal={setShowThumbnailModal}
        />

        {/*클러스터 상세 정보 패널 */}
        {showDetails && (
            <ClusterDetailPanel
                image={image}
                showDetails={showDetails}
                setShowDetails={setShowDetails}
                isEditing={isEditing}
                isOwner={isOwner}
                onImageSelect={onImageSelect}
                ownerId={ownerId} 
                profile={profile}
            />
        )}
    </> 
    );
}

export default DraggableImage;

