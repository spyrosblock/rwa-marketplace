// import React, { useState } from 'react';
// import Link from 'next/link';
// import { useRouter } from 'next/navigation';
// import UploadInput from './UploadInput';
// import { Box, Tab, TabIndicator, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
// import { useAccount } from 'wagmi';
// import { Button } from '~~/components';
// import { useScaffoldContractRead } from '~~/hooks/scaffold-eth';
// import useGlobalState, { nft } from '~~/services/store/store';

// const SelectStep = () => {
//   const [loading, setLoading] = useState(false);
//   const [, setError] = useState('');
//   const [nftData, setNftData] = useGlobalState(nft);
//   const { address } = useAccount();
//   const NftBalance = Number(
//     useScaffoldContractRead({
//       contractName: 'NFTFactory',
//       functionName: 'balanceOf',
//       args: [address],
//     }).data || 0,
//   );
//   const hodler = NftBalance !== 0;
//   const router = useRouter();
//   const onDrop = async (event: any) => {
//     let isPdf;
//     let imageUrl;
//     if (nftData.address) {
//       console.log('existing', event);
//     } else {
//       isPdf = event[0].type.includes('pdf');
//       if (isPdf) {
//         setError(
//           'Legal document PDF upload comes on the next step, for now upload an image to represent your document',
//         );
//       } else {
//         try {
//           imageUrl = URL.createObjectURL(event[0]);
//         } catch (error) {
//           setError(error as any);
//         }
//         setLoading(true);
//         setNftData({
//           ...nftData,
//           file: event[0],
//           imageUrl,
//         });
//       }
//     }
//     router.push('/create');
//   };
//   return (
//     <Box w={'full'}>
//       <Tabs align="center" variant="unstyled" colorScheme="blueBrand">
//         <TabList>
//           <Tab>Create NFT</Tab>
//           <Tab>Existing NFT</Tab>
//         </TabList>
//         <TabIndicator mt="-1.5px" height="2px" bg="blueBrand" borderRadius="1px" />
//         <TabPanels>
//           <TabPanel>
//             <UploadInput type="image" onDrop={onDrop} loading={loading} />
//           </TabPanel>
//           <TabPanel>
//             <div className="h-48 flex items-center">
//               {hodler ? (
//                 <>
//                   <div className="flex space-x-2 justify-center flex-wrap">
//                     {Array(NftBalance)
//                       .fill(0)
//                       .map((_, i) => (
//                         <Link href={`/nft?index=${i}`} key={i} className="self-center mb-2">
//                           <Button colorScheme="teal">
//                             <> NFT #{i + 1}</>
//                           </Button>
//                         </Link>
//                       ))}
//                   </div>
//                 </>
//               ) : (
//                 <div role="alert" className="alert shadow-sm bg-white">
//                   {/* <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                   className="stroke-info h-6 w-6 shrink-0"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth="2"
//                     d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
//                   ></path>
//                 </svg> */}
//                   <p>😢 You have no NFTs on this network</p>
//                 </div>
//               )}
//               {/* <InputGroup>
//               <InputLeftAddon>NFT Address</InputLeftAddon>
//               <Input
//                 id="address"
//                 type="text"
//                 backgroundColor="white"
//                 placeholder="0x1234..."
//                 onChange={handleInputChange}
//               />
//             </InputGroup>
//             <InputGroup mt={2}>
//               <InputLeftAddon>NFT ID</InputLeftAddon>
//               <Input id="id" type="text" backgroundColor="white" placeholder="32" onChange={handleInputChange} />
//             </InputGroup>
//             {nftData.id && nftData.address && (
//               <Button backgroundColor={'green'} mt={5} id="existing_nft" onClick={onDrop}>
//                 Start
//               </Button>
//             )} */}
//             </div>
//           </TabPanel>
//         </TabPanels>
//       </Tabs>
//     </Box>
//   );
// };

// export default SelectStep;
